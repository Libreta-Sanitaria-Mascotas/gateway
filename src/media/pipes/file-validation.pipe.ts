import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

type UploadedFilePayload = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  path?: string;
};

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
  ];
  private readonly maxSize = 10 * 1024 * 1024; // 10MB

  transform(file: UploadedFilePayload) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no soportado. Solo se permiten: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxSize) {
      throw new BadRequestException(
        'Archivo demasiado grande. Tamaño máximo: 10MB',
      );
    }

    return file;
  }
}
