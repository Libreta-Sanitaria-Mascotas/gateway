import {
  Injectable,
  InternalServerErrorException,
  BadGatewayException,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { envs } from 'src/config';

type UploadFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@Injectable()
export class MediaHttpService {
  private readonly baseUrl = envs.mediaServiceUrl;

  async uploadFile(file: UploadFile, entityType: 'pet' | 'health' | 'user', entityId?: string) {
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
      console.log('[MediaHttpService] Uploading to:', uploadUrl);
      console.log('[MediaHttpService] baseUrl from envs:', this.baseUrl);

      const { data } = await axios.post(uploadUrl, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 5000,
      });
      return data;
    } catch (error) {
      console.error('[MediaHttpService] Upload error:', error.message);
      console.error('[MediaHttpService] Error details:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        code: error?.code,
      });
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
}
