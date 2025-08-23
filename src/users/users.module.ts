import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_SERVICE, envs } from '../config';
import { UsersController } from './users.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: USER_SERVICE,
        transport: Transport.TCP,
        options: {
          host: envs.userService,
          port: envs.userServicePort,
        },
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [],
  exports: [ClientsModule],
})
export class UsersModule { }
