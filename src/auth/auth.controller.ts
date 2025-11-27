import { Inject, Controller, Post, Body, UseGuards, Req, Patch, BadRequestException, HttpCode, HttpStatus, Delete, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { lastValueFrom, timeout } from 'rxjs';
import { AUTH_SERVICE, USER_SERVICE, envs } from 'src/config';
import { RegisterDto, LoginDto, UpdateCredentialsDto, ForgotPasswordDto, ResetPasswordDto, GoogleAuthDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoggerService } from '../common/logger/logger.service';
import { JwtService } from '@nestjs/jwt';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly clientAuthService: ClientProxy,
    @Inject(USER_SERVICE) private readonly clientUserService: ClientProxy,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  @ApiOperation({ summary: 'Register a new user' })
  @Post('register')
  async register(@Req() req, @Body() registerDto: RegisterDto){
    try {
      const { email, password, firstName, lastName } = registerDto;
      const authRes = await lastValueFrom(
        this.clientAuthService.send(
          { cmd: 'register' },
          { email, password, ip: req.ip },
        ).pipe(timeout(5000)),
      );

      const credentialId = this.decodeCredentialId(authRes?.access_token);

      try {
        await this.syncUserProfile(credentialId, firstName, lastName);
      } catch (err) {
        await this.revokeRefreshToken(credentialId);
        throw err;
      }

      return { ...authRes, credentialId };
    } catch (error) {
      this.logger.error('Error during register flow', error.stack, 'AuthController.register');
      throw error;
    }
  }

  @ApiOperation({ summary: 'Login a user' })
  @Post('login')
  async login(@Body() loginDto: LoginDto){
    try {
      const res = await lastValueFrom(this.clientAuthService.send({cmd: 'login'}, loginDto));
      return res;
    } catch (error) {
      throw error
    }
  }

  @ApiOperation({summary: 'Autenticarse/Registrarse con Google' })
  @Post('google')
  async googleLogin(@Body() googleAuthDto: GoogleAuthDto) {
    try {
      const authRes = await lastValueFrom(
        this.clientAuthService.send(
          { cmd: 'google_login' }, 
          googleAuthDto
        ).pipe(timeout(8000)),
      );

      const credentialId = this.decodeCredentialId(authRes?.access_token);
      const providerData = authRes?.providerData || {};
      const firstName = providerData.given_name || providerData.name;
      const lastName = providerData.family_name || '';

      try {
        await this.syncUserProfile(credentialId, firstName, lastName);
      } catch (err) {
        await this.revokeRefreshToken(credentialId);
        throw err;
      }

      return { ...authRes, credentialId };
    } catch (error) {
      this.logger.error('Error during Google login', error.stack, 'AuthController.googleLogin');
      throw error;
    }
  }

  @ApiOperation({ summary: 'Vincular cuenta existente con Google' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('google/link')
  async linkGoogle(@Req() req, @Body() googleAuthDto: GoogleAuthDto) {
    try {
      const credentialId = req.user?.userId;
      const res = await lastValueFrom(
        this.clientAuthService.send(
          { cmd: 'google_link' }, 
          { credentialId, idToken: googleAuthDto.idToken }
        ).pipe(timeout(8000)),
      );

      const providerData = res?.providerData || {};
      const firstName = providerData.given_name || providerData.name;
      const lastName = providerData.family_name || '';

      try {
        await this.syncUserProfile(credentialId, firstName, lastName);
      } catch (error) {
        this.logger.warn(
          `Linked Google but failed to sync user profile: ${error?.message}`,
          'AuthController.linkGoogle',
        );
      }

      return res;
    } catch (error) {
      this.logger.error('Error linking Google account', error.stack, 'AuthController.linkGoogle');
      throw error;
    }
  }

  @ApiOperation({ summary: 'Desvincular Google de la cuenta' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('google/unlink')
  async unlinkGoogle(@Req() req) {
    try {
      const credentialId = req.user?.userId;
      const res = await lastValueFrom(
        this.clientAuthService.send(
          { cmd: 'google_unlink' }, 
          { credentialId }
        )
      );
      return res;
    } catch (error) {
      this.logger.error('Error unlinking Google account', error.stack, 'AuthController.unlinkGoogle');
      throw error;
    }
  }

  @ApiOperation({ summary: 'Obtener información del proveedor de autenticación' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('provider-info')
  async getProviderInfo(@Req() req) {
    try {
      const credentialId = req.user?.userId;
      const res = await lastValueFrom(
        this.clientAuthService.send(
          { cmd: 'get_provider_info' }, 
          { credentialId }
        )
      );
      return res;
    } catch (error) {
      this.logger.error('Error getting provider info', error.stack, 'AuthController.getProviderInfo');
      throw error;
    }
  }

  @ApiOperation({ summary: 'Refresh a token' })
  @ApiBody({ schema: { example: { refresh_token: '...' } } })
  @Post('refresh')
  async refresh(@Body() refreshDto: { refresh_token: string }){
    try {
      return await lastValueFrom(this.clientAuthService.send({cmd: 'refresh'}, refreshDto));
    } catch (error) {
      this.logger.error('Error refreshing token', error.stack, 'AuthController.refresh');
      throw error;
    }
  }


  @ApiOperation({ summary: 'Logout a user' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req){
    try {
      const userId = req.user?.userId;
      return await lastValueFrom(this.clientAuthService.send({cmd: 'logout'}, { userId }));
    } catch (error) {
      this.logger.error('Error during logout', error.stack, 'AuthController.logout');
      throw error;
    }
  }

  @ApiOperation({ summary: 'Actualizar credenciales (email y/o contraseña)' })
  @ApiBearerAuth()
  @ApiBody({ type: UpdateCredentialsDto })
  @UseGuards(JwtAuthGuard)
  @Patch('credentials')
  async updateCredentials(@Req() req, @Body() updateCredentialsDto: UpdateCredentialsDto) {
    if (!updateCredentialsDto.email && !updateCredentialsDto.password) {
      throw new BadRequestException('Debe enviar email o contraseña para actualizar');
    }

    const credentialId = req.user?.userId;
    return await lastValueFrom(
      this.clientAuthService.send(
        { cmd: 'update_credentials' },
        { credentialId, ...updateCredentialsDto },
      ),
    );
  }

  @ApiOperation({ summary: 'Recuperación de contraseña: solicitar email' })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Req() req, @Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      return await lastValueFrom(
        this.clientAuthService.send(
          { cmd: 'forgot_password' },
          { ...forgotPasswordDto, ip: req.ip },
        ),
      );
    } catch (error) {
      this.logger.error('Error processing forgot password', error.stack, 'AuthController.forgotPassword');
      throw error;
    }
  }

  @ApiOperation({ summary: 'Recuperación de contraseña: restablecer con token' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      return await lastValueFrom(
        this.clientAuthService.send({ cmd: 'reset_password' }, resetPasswordDto),
      );
    } catch (error) {
      this.logger.error('Error resetting password', error.stack, 'AuthController.resetPassword');
      throw error;
    }
  }

  private decodeCredentialId(token: string): string {
    try {
      const payload = this.jwtService.verify(token, { secret: envs.jwt.secret });
      return payload?.id;
    } catch (error) {
      this.logger.error('Failed to decode credentialId from token', error.stack, 'AuthController.decodeCredentialId');
      throw error;
    }
  }

  private async syncUserProfile(
    credentialId: string,
    firstName?: string,
    lastName?: string,
  ) {
    if (!credentialId) {
      throw new BadRequestException('Credencial inválida');
    }

    const existing = await lastValueFrom(
      this.clientUserService
        .send({ cmd: 'find_user_by_credential_id' }, { credentialId })
        .pipe(timeout(5000)),
    );

    if (existing?.id) {
      const updatePayload: Record<string, any> = { id: existing.id };
      if (firstName !== undefined) updatePayload.firstName = firstName;
      if (lastName !== undefined) updatePayload.lastName = lastName;

      await lastValueFrom(
        this.clientUserService
          .send({ cmd: 'update_user' }, updatePayload)
          .pipe(timeout(5000)),
      );
      return;
    }

    await lastValueFrom(
      this.clientUserService
        .send(
          { cmd: 'create_user' },
          { credentialId, firstName, lastName },
        )
        .pipe(timeout(5000)),
    );
  }

  private async revokeRefreshToken(credentialId: string) {
    if (!credentialId) return;
    try {
      await lastValueFrom(
        this.clientAuthService
          .send({ cmd: 'logout' }, { userId: credentialId })
          .pipe(timeout(3000)),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to revoke refresh token during rollback: ${error?.message}`,
        'AuthController.revokeRefreshToken',
      );
    }
  }
}
