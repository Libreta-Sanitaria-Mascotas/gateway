import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaHttpService } from './media-http.service';
import { LoggerService } from '../common/logger/logger.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaHttpService,
    {
      provide: LoggerService,
      useFactory: () => new LoggerService('MediaModule'),
    },
  ],
  exports: [MediaHttpService],
})
export class MediaModule {}
