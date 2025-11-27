import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { requestContext } from '../context/request-context';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(context: string) {
    const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: context },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
              return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
            }),
          ),
        }),
      ],
    });

    // En producción, agregar transport de archivos
    if (process.env.NODE_ENV === 'production') {
      this.logger.add(new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error' 
      }));
      this.logger.add(new winston.transports.File({ 
        filename: 'logs/combined.log' 
      }));
    }
  }

  private withRequestMeta(meta?: Record<string, any>) {
    const requestId = requestContext.getRequestId();
    return requestId ? { requestId, ...meta } : meta;
  }

  log(message: string, context?: string) {
    this.logger.info(message, this.withRequestMeta({ context }));
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, this.withRequestMeta({ trace, context }));
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, this.withRequestMeta({ context }));
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, this.withRequestMeta({ context }));
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, this.withRequestMeta({ context }));
  }
}
