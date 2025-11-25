import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

@Catch()
export class RpcToHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = exception.message;
      return response.status(status).json({ statusCode: status, message });
    }

    if (exception instanceof RpcException) {
      const error = exception.getError() as any;
      const status = error?.statusCode || HttpStatus.BAD_GATEWAY;
      const message = error?.message || 'Upstream service error';
      return response.status(status).json({ statusCode: status, message });
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';
    return response.status(status).json({ statusCode: status, message });
  }
}
