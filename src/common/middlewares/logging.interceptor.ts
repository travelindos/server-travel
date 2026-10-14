import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Fields that must never appear in logs.
 * Any key matching these (case-insensitive) will be replaced with ***MASKED***.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'confirmpassword',
  'newpassword',
  'confirmNewPassword',
  'currentpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'verify_code',
  'reset_password_token',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'api_key',
  'creditcard',
  'cvv',
]);

function sanitize(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.keys(obj).reduce((acc, key) => {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      acc[key] = '***MASKED***';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      acc[key] = sanitize(obj[key]);
    } else {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as Record<string, any>);
}

/**
 * Central HTTP Logging Interceptor.
 * Logs every incoming request and outgoing response with:
 *  - Method, URL, IP, User-Agent
 *  - Sanitized Request Body (sensitive fields masked)
 *  - Response Status Code & Latency (ms)
 *  - Correlation/Trace ID
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip, body, headers } = request;
    const traceId: string = (request as any).correlationId || '-';
    const userAgent = headers['user-agent'] || '-';
    const start = Date.now();

    const sanitizedBody = body && Object.keys(body).length > 0
      ? sanitize(body)
      : undefined;

    this.logger.log(
      'info',
      `→ ${method} ${url}`,
      {
        context: 'HTTP',
        traceId,
        ip,
        userAgent,
        ...(sanitizedBody ? { body: sanitizedBody } : {}),
      },
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const latency = Date.now() - start;
          const statusCode = response.statusCode;
          const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

          this.logger.log(
            level,
            `← ${method} ${url} ${statusCode} (${latency}ms)`,
            {
              context: 'HTTP',
              traceId,
              statusCode,
              latency,
            },
          );
        },
        error: (err) => {
          const latency = Date.now() - start;
          const statusCode = err?.status || 500;

          this.logger.log(
            statusCode >= 500 ? 'error' : 'warn',
            `← ${method} ${url} ${statusCode} (${latency}ms) — ${err?.message}`,
            {
              context: 'HTTP',
              traceId,
              statusCode,
              latency,
              stack: err?.stack,
            },
          );
        },
      }),
    );
  }
}
