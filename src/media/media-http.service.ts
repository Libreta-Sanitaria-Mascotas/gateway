import {
  Injectable,
  InternalServerErrorException,
  BadGatewayException,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { envs } from 'src/config';
import { LoggerService } from '../common/logger/logger.service';

type UploadFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@Injectable()
export class MediaHttpService {
  private readonly baseUrl = envs.mediaServiceUrl;

  constructor(private readonly logger: LoggerService) {}

  async uploadFile(file: UploadFile, entityType: 'pet' | 'health' | 'user', entityId?: string) {
    const maxSizeBytes = 6 * 1024 * 1024; // 6MB
    if (file?.buffer?.length > maxSizeBytes) {
      throw new BadGatewayException('Archivo demasiado grande para subir al servicio de media (máx 6MB)');
    }
    try {
      const form = new FormData();
      form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
      form.append('entityType', entityType);
      if (entityId) {
        form.append('entityId', entityId);
      }

      const uploadUrl = `${this.baseUrl}/media/upload`;
      this.logger.debug(`Uploading to: ${uploadUrl}`, 'MediaHttpService.uploadFile');

      const { data } = await axios.post(uploadUrl, form, {
        headers: form.getHeaders(),
        maxContentLength: maxSizeBytes,
        maxBodyLength: maxSizeBytes,
        timeout: 5000,
        validateStatus: (status) => status >= 200 && status < 500,
      });
      if (data?.id === undefined && data?.statusCode >= 400) {
        throw new BadGatewayException(data?.message || 'Media Service rechazó el archivo');
      }
      return data;
    } catch (error) {
      this.logger.error(`Upload error: ${error.message}`, JSON.stringify({
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        code: error?.code,
      }), 'MediaHttpService.uploadFile');
      const status = error?.response?.status || 502;
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo cargar el archivo en Media Service';
      if (status >= 500) {
        throw new BadGatewayException(message);
      }
      throw new InternalServerErrorException(message);
    }
  }

  async updateMetadata(id: string, body: Record<string, any>) {
    try {
      const updateUrl = `${this.baseUrl}/media/${id}`;
      const { data } = await axios.post(updateUrl, body, {
        timeout: 5000,
      });
      return data;
    } catch (error) {
      const status = error?.response?.status || 502;
      const message = error?.response?.data?.message || error?.message || 'No se pudo actualizar el archivo';
      if (status >= 500) {
        throw new BadGatewayException(message);
      }
      throw new InternalServerErrorException(message);
    }
  }

  async getFileStream(id: string) {
    try {
      const fileUrl = `${this.baseUrl}/media/${id}`;
      return await axios.get(fileUrl, {
        responseType: 'stream',
        timeout: 5000,
      });
    } catch (error) {
      const status = error?.response?.status || 502;
      const message = error?.response?.data?.message || error?.message || 'No se pudo obtener el archivo';
      if (status === 404) {
        throw new NotFoundException('Archivo no encontrado');
      }
      if (status >= 500) {
        throw new BadGatewayException(message);
      }
      throw new InternalServerErrorException(message);
    }
  }

  async ingestFromUrl(url: string, entityType: 'pet' | 'health' | 'user', entityId?: string) {
    try {
      const ingestUrl = `${this.baseUrl}/media/ingest-url`;
      const payload = { url, entityType, entityId };

      const { data } = await axios.post(ingestUrl, payload, {
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024, // 10MB
        maxBodyLength: 10 * 1024 * 1024, // 10MB
      });
      return data;
    } catch (error) {
      const status = error?.response?.status || 502;
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'No se pudo ingestar el archivo desde la URL';
      this.logger.error(`Ingest error: ${message}`, JSON.stringify({
        url,
        status,
        data: error?.response?.data,
        code: error?.code,
      }), 'MediaHttpService.ingestFromUrl');

      if (status >= 500) {
        throw new BadGatewayException(message);
      }
      throw new InternalServerErrorException(message);
    }
  }
}
