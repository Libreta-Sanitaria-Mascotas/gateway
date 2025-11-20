import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MediaController } from './media.controller';
import { MEDIA_SERVICE } from 'src/config';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: MEDIA_SERVICE,
        transport: Transport.TCP,
        options: {
          host: 'media',
          port: 3005,
        },
      },
    ]),
  ],
  controllers: [MediaController],
})
export class MediaModule {}
