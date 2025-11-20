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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

@ApiTags('Media')
@Controller('media')
export class MediaController {
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir archivo (imagen o PDF)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        entityType: {
          type: 'string',
          enum: ['pet', 'health'],
        },
        entityId: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo subido exitosamente',
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file,
    @Body('entityType') entityType: 'pet' | 'health',
    @Body('entityId') entityId: string,
  ) {
    // Por ahora, devolvemos la información del archivo
    // En el futuro, esto se enviará al Media Service via microservice
    return {
      message: 'Archivo recibido en Gateway',
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      entityType,
      entityId,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener archivo por ID' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  async getFile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    // TODO: Implementar proxy al Media Service
    return res.status(501).json({ message: 'Not implemented yet' });
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
    // TODO: Implementar proxy al Media Service
    return { message: 'Not implemented yet', entityType, entityId };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar archivo' })
  @ApiParam({ name: 'id', description: 'ID del archivo' })
  async deleteFile(@Param('id', ParseUUIDPipe) id: string) {
    // TODO: Implementar proxy al Media Service
    return { message: 'Not implemented yet', id };
  }
}
