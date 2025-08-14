import { Inject, Controller, Post, Body } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';
import { AUTH_SERVICE } from 'src/config';
import { RegisterDto, LoginDto } from './dto';

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
      return error;
    }
  }

  @ApiOperation({ summary: 'Login a user' })
  @Post('login')
  async login(@Body() loginDto: LoginDto){
    try {
      const res = await lastValueFrom(this.clientAuthService.send({cmd: 'login'}, loginDto));
      return res;
    } catch (error) {
      return error
    }
  }

  @ApiOperation({ summary: 'Refresh a token' })
  @Post('refresh')
  refresh(){
    return 'estoy en refresh';
  }

  @ApiOperation({ summary: 'Logout a user' })
  @Post('logout')
  logout(){
    return 'estoy en logout';
  }
}
