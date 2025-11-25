import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MEDIA_SERVICE, USER_SERVICE, getRabbitmqUrl } from '../config';
import { UsersController } from './users.controller';

@Module({
  imports: [
    ClientsModule.register([
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
      {
        name: MEDIA_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [getRabbitmqUrl()],
          queue: 'media_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [],
  exports: [ClientsModule],
})
export class UsersModule { }
