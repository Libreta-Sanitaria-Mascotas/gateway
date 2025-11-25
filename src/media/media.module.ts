import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaHttpService } from './media-http.service';

@Module({
  controllers: [MediaController],
  providers: [MediaHttpService],
  exports: [MediaHttpService],
})
export class MediaModule {}
