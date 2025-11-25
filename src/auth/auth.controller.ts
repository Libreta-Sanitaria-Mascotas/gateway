import { Inject, Controller, Post, Body, UseGuards, Req, Patch, BadRequestException, HttpCode, HttpStatus, Delete, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';
import { AUTH_SERVICE } from 'src/config';
import { RegisterDto, LoginDto, UpdateCredentialsDto, ForgotPasswordDto, ResetPasswordDto, GoogleAuthDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly clientAuthService: ClientProxy) {}

  @ApiOperation({ summary: 'Register a new user' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto){
    try {
      const res = await lastValueFrom(this.clientAuthService.send({cmd: 'register'}, registerDto));
      return res;
    } catch (error) {
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
      const res = await lastValueFrom(
        this.clientAuthService.send(
          { cmd: 'google_login' }, 
          googleAuthDto
        )
      );
      return res;
    } catch (error) {
      console.log('[Google Login Error]', error);
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
        )
      );
      return res;
    } catch (error) {
      console.log('[Google Link Error]', error);
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
      console.log('[Google Unlink Error]', error);
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
      console.log('[Get Provider Info Error]', error);
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
      console.log('[Refresh Error]', error);
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
      console.log('[Logout Error]', error);
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
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      return await lastValueFrom(
        this.clientAuthService.send({ cmd: 'forgot_password' }, forgotPasswordDto),
      );
    } catch (error) {
      console.log('[ForgotPassword Error]', error);
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
      console.log('[ResetPassword Error]', error);
      throw error;
    }
  }
}
