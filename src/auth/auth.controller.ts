import { Inject, Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';
import { AUTH_SERVICE } from 'src/config';
import { RegisterDto, LoginDto } from './dto';
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
}
