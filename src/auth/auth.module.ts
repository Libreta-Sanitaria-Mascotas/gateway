import { ClientsModule, Transport } from '@nestjs/microservices';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AUTH_SERVICE, getRabbitmqUrl } from 'src/config';
import { USER_SERVICE } from 'src/config';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoggerService } from 'src/common/logger/logger.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { envs } from 'src/config';
@Module({
  imports: [
    JwtModule.register({
      secret: envs.jwt.secret,
      signOptions: { expiresIn: envs.jwt.expiresIn },
    }),
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
      {
        name: USER_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [getRabbitmqUrl()],
          queue: 'user_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ])
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    {
      provide: LoggerService,
      useFactory: () => new LoggerService('GatewayAuthModule'),
    },
    JwtAuthGuard
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
