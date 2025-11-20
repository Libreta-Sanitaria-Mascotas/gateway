import { Module } from '@nestjs/common';
import { PetController } from './pet.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PET_SERVICE, MEDIA_SERVICE, getRabbitmqUrl } from 'src/config';
import { UsersModule } from 'src/users/users.module';
import { CustomCacheModule } from 'src/cache/cache.module';
import { CreatePetWithPhotoSaga } from 'src/sagas/create-pet-with-photo.saga';

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
  providers: [CreatePetWithPhotoSaga],
  exports: [ClientsModule],
})
export class PetModule {}
