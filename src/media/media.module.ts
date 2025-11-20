import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MediaController } from './media.controller';
import { HEALTH_SERVICE, MEDIA_SERVICE, getRabbitmqUrl } from 'src/config';
import { FileValidationPipe } from './pipes/file-validation.pipe';

@Module({
  imports: [
    ClientsModule.register([
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
    ]),
  ],
  controllers: [MediaController],
  providers: [FileValidationPipe],
})
export class MediaModule {}
