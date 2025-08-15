import { ClientsModule, Transport } from '@nestjs/microservices';
import { Module } from '@nestjs/common';
import { envs, AUTH_SERVICE } from 'src/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUTH_SERVICE,
        transport: Transport.TCP,
        options: {
          host: envs.authService,
          port: envs.authServicePort,
        },
      },
    ])
  ],
  controllers: [AuthController],
  providers: [JwtStrategy,JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
