import { Module } from '@nestjs/common';
import { PetController } from './pet.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PET_SERVICE, MEDIA_SERVICE, getRabbitmqUrl } from 'src/config';
import { UsersModule } from 'src/users/users.module';
import { CustomCacheModule } from 'src/cache/cache.module';
import { CreatePetWithPhotoSaga } from 'src/sagas/create-pet-with-photo.saga';
import { MediaHttpService } from 'src/media/media-http.service';
import { LoggerService } from 'src/common/logger/logger.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: PET_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [getRabbitmqUrl()],
          queue: 'pet_queue',
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
    UsersModule,
    CustomCacheModule,
  ],
  controllers: [PetController],
  providers: [
    CreatePetWithPhotoSaga,
    MediaHttpService,
    {
      provide: LoggerService,
      useFactory: () => new LoggerService('PetModule'),
    },
  ],
  exports: [ClientsModule],
})
export class PetModule {}
