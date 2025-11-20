import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ClientProxy } from '@nestjs/microservices';
import { HEALTH_SERVICE, MEDIA_SERVICE } from 'src/config';
import { lastValueFrom } from 'rxjs';
import { Throttle } from '@nestjs/throttler';
import { UploadMediaDto } from './dto/upload-media.dto';
import { FileValidationPipe } from './pipes/file-validation.pipe';
type UploadedFilePayload = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  path?: string;
};

const streamingStorage = diskStorage({
  destination: (req, file, cb) => {
    const destinationPath = path.join(process.cwd(), 'temp-uploads');
    fs.mkdirSync(destinationPath, { recursive: true });
    cb(null, destinationPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(
    @Inject(MEDIA_SERVICE) private readonly mediaClient: ClientProxy,
    @Inject(HEALTH_SERVICE) private readonly healthClient: ClientProxy,
  ) {}

  @Post('upload')
  @Throttle({ global: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir archivo (imagen o PDF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        entityType: { type: 'string', enum: ['pet', 'health'] },
        entityId: { type: 'string', format: 'uuid' },
        healthRecordId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo subido exitosamente',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadFile(
    @UploadedFile(FileValidationPipe) file: UploadedFilePayload,
    @Body() uploadMediaDto: UploadMediaDto,
  ) {
    const payload = {
      file: {
        data: file.buffer.toString('base64'),
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      entityType: uploadMediaDto.entityType,
      entityId: uploadMediaDto.entityId,
    };

    const media = await lastValueFrom(
      this.mediaClient.send({ cmd: 'upload_file' }, payload),
    );

    if (uploadMediaDto.entityType === 'health' && uploadMediaDto.healthRecordId) {
      await this.linkMediaToHealth(uploadMediaDto.healthRecordId, media.id);
    }

    return media;
  }

  @Post('upload-stream')
  @Throttle({ global: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        entityType: { type: 'string', enum: ['pet', 'health'] },
        entityId: { type: 'string', format: 'uuid' },
        healthRecordId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: streamingStorage,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
  )
  @ApiOperation({ summary: 'Subir archivo grande (streaming)' })
  async uploadFileStream(
    @UploadedFile(FileValidationPipe) file: UploadedFilePayload,
    @Body() uploadMediaDto: UploadMediaDto,
  ) {
    const filePath = file.path;
    if (!filePath) {
      throw new BadRequestException('Ruta de archivo temporal no disponible');
    }
    const safeFilePath = filePath;
    try {
      const fileStream = fs.createReadStream(safeFilePath);
      const chunks: Buffer[] = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk as Buffer);
      }
      const buffer = Buffer.concat(chunks);
      const payload = {
        file: {
          data: buffer.toString('base64'),
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
        entityType: uploadMediaDto.entityType,
        entityId: uploadMediaDto.entityId,
      };

      const media = await lastValueFrom(
        this.mediaClient.send({ cmd: 'upload_file' }, payload),
      );

      if (uploadMediaDto.entityType === 'health' && uploadMediaDto.healthRecordId) {
        await this.linkMediaToHealth(uploadMediaDto.healthRecordId, media.id);
      }

      fs.unlinkSync(safeFilePath);
      return media;
    } catch (error) {
      if (fs.existsSync(safeFilePath)) {
        fs.unlinkSync(safeFilePath);
      }
      throw error;
    }
  }

  @Get(':id')
  @Throttle({ global: { limit: 100, ttl: 60 } })
  @ApiOperation({ summary: 'Obtener archivo por ID' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  async getFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const result = await lastValueFrom(
      this.mediaClient.send({ cmd: 'get_file' }, { id }),
    );
    const fileBuffer = Buffer.from(result.file, 'base64');
    res.set({
      'Content-Type': result.mimeType,
      'Content-Disposition': `inline; filename="${result.originalName}"`,
    });
    return res.send(fileBuffer);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener archivos por entidad' })
  @ApiQuery({ name: 'entityType', enum: ['pet', 'health'] })
  @ApiQuery({ name: 'entityId', description: 'ID de la entidad' })
  async getFilesByEntity(
    @Query('entityType') entityType: 'pet' | 'health',
    @Query('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return await lastValueFrom(
      this.mediaClient.send(
        { cmd: 'list_files_by_entity' },
        { entityType, entityId },
      ),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar archivo' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  async deleteFile(@Param('id', ParseUUIDPipe) id: string) {
    return await lastValueFrom(
      this.mediaClient.send({ cmd: 'delete_file' }, { id }),
    );
  }

  private async linkMediaToHealth(healthRecordId: string, mediaId: string) {
    try {
      await lastValueFrom(
        this.healthClient.send(
          { cmd: 'link_media' },
          { healthRecordId, mediaId },
        ),
      );
    } catch (error) {
      console.error('[Media] Error vinculando certificado:', error);
    }
  }
}
