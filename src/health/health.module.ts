import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './health.controller';
import { HEALTH_SERVICE, MEDIA_SERVICE, getRabbitmqUrl } from 'src/config';
import { PetModule } from 'src/pets/pet.module';
import { UsersModule } from 'src/users/users.module';
import { CustomCacheModule } from 'src/cache/cache.module';
import { CreateHealthWithAttachmentsSaga } from 'src/sagas/create-health-with-attachments.saga';
import { MediaHttpService } from 'src/media/media-http.service';
import { LoggerService } from 'src/common/logger/logger.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: HEALTH_SERVICE,
        transport: Transport.RMQ,
        options: {
          urls: [getRabbitmqUrl()],
          queue: 'health_queue',
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
    PetModule,
    UsersModule,
    CustomCacheModule,
  ],
  controllers: [HealthController],
  providers: [
    CreateHealthWithAttachmentsSaga,
    MediaHttpService,
    {
      provide: LoggerService,
      useFactory: () => new LoggerService('HealthModule'),
    },
  ],
})
export class HealthModule { }
