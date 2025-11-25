import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MEDIA_SERVICE, USER_SERVICE, getRabbitmqUrl } from '../config';
import { UsersController } from './users.controller';
import { MediaHttpService } from 'src/media/media-http.service';
import { CustomCacheModule } from 'src/cache/cache.module';

@Module({
  imports: [
    CustomCacheModule,
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
  providers: [MediaHttpService],
  exports: [ClientsModule],
})
export class UsersModule { }
