import { ClientsModule, Transport } from '@nestjs/microservices';
import { Module } from '@nestjs/common';
import { AUTH_SERVICE, getRabbitmqUrl } from 'src/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUTH_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [getRabbitmqUrl()],
          queue: 'auth_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ])
  ],
  controllers: [AuthController],
  providers: [JwtStrategy,JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
