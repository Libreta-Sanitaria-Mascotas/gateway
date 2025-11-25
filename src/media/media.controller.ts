import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MediaHttpService } from './media-http.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaHttpService: MediaHttpService) {}

  @ApiOperation({ summary: 'Subir archivo a media-service' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  @Post('upload')
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityType') entityType: 'pet' | 'health' | 'user',
    @Body('entityId') entityId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }
    return this.mediaHttpService.uploadFile(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      },
      entityType,
      entityId,
    );
  }

  @ApiOperation({ summary: 'Actualizar metadatos de media' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id')
  async updateMetadata(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.mediaHttpService.updateMetadata(id, body);
  }

  @ApiOperation({ summary: 'Obtener archivo por ID (proxy a media-service)' })
  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const mediaResponse = await this.mediaHttpService.getFileStream(id);
    const contentType = mediaResponse.headers['content-type'];
    const contentLength = mediaResponse.headers['content-length'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    return mediaResponse.data.pipe(res);
  }
}
