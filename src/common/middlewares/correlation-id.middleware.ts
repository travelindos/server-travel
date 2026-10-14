import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * Injects a unique Correlation/Trace ID into every request.
 * If the client sends one, it is forwarded; otherwise a fresh UUID is generated.
 * The ID is attached to `req.correlationId` and echoed back in the response header.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string;
    const correlationId = existing || randomUUID();

    // Attach to request object for downstream use (interceptors, filters, etc.)
    (req as any).correlationId = correlationId;

    // Echo the ID back in the response header so clients can correlate
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    next();
  }
}
