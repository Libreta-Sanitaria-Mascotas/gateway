import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestContext } from '../context/request-context';

/**
 * Ensures each request has an X-Request-Id header and stores it in AsyncLocalStorage
 * for logging correlation.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incomingId =
      req.headers['x-request-id'] ||
      req.headers['x-correlation-id'] ||
      req.headers['x-requestid'];

    const requestId = (Array.isArray(incomingId) ? incomingId[0] : incomingId)?.toString() || randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    requestContext.run(requestId, () => next());
  }
}
