import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const key = req.headers['idempotency-key'];
    // Header is optional: requests without it behave as before
    if (!key || Array.isArray(key)) return next.handle();

    const userId = (req as any).customer?.id || (req as any).user?.id;
    // Never scope a key to an anonymous caller
    if (!userId) return next.handle();

    const result = await this.idempotency.begin(
      userId,
      key,
      req.originalUrl || req.url,
      req.method,
      req.body,
    );

    if (result.isReplay) {
      res.setHeader('Idempotency-Replayed', 'true');
      if (result.statusCode) res.status(result.statusCode);
      return of(result.cachedResponse);
    }

    const recordId = result.recordId as string;
    return next.handle().pipe(
      // Await the save so the key is COMPLETED before the client gets the response
      mergeMap(async (body) => {
        await this.idempotency.complete(recordId, res.statusCode || 200, body);
        return body;
      }),
      catchError((err) =>
        // Failed attempts are not cached; free the key so the client can retry
        from(this.idempotency.release(recordId).catch(() => undefined)).pipe(
          mergeMap(() => throwError(() => err)),
        ),
      ),
    );
  }
}
