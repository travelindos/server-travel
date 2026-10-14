import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Request, Response } from 'express';
import { Logger } from 'winston';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Global Exception Filter.
 * Catches ALL exceptions (HTTP + Unhandled) and:
 *  - Logs them centrally (4xx → WARN, 5xx → ERROR with stack trace)
 *  - Returns a safe, structured JSON response to the client
 */
@Catch()
export class ErrorsService implements ExceptionFilter {
  constructor(
    @Optional()
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger?: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId: string = (request as any)?.correlationId || '-';
    const method = request?.method || '-';
    const url = request?.url || '-';

    // ─── HTTP Exception ──────────────────────────────────────────────────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      // Normalize error payload
      const errorPayload = this.buildErrorPayload(status, res);

      // Log 4xx as WARN, 5xx as ERROR
      const logLevel = status >= 500 ? 'error' : 'warn';
      this.log(logLevel, `${method} ${url} → HTTP ${status}: ${exception.message}`, {
        traceId,
        statusCode: status,
        ...(status >= 500 ? { stack: exception.stack } : {}),
      });

      response.status(status).json(errorPayload);
      return;
    }

    // ─── Unhandled / Internal Error ─────────────────────────────────────────
    const err = exception as any;
    const status = HttpStatus.INTERNAL_SERVER_ERROR;

    this.log('error', `${method} ${url} → Unhandled Exception: ${err?.message || 'Unknown error'}`, {
      traceId,
      statusCode: status,
      stack: err?.stack,
    });

    response.status(status).json({
      status,
      message: 'Internal server error',
      error: { field: 'general', body: 'An unexpected error occurred. Please try again later.' },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private log(level: string, message: string, meta: Record<string, any>): void {
    if (this.logger) {
      this.logger.log(level, message, { context: 'ExceptionFilter', ...meta });
    } else {
      // Fallback for very early bootstrap errors (logger not yet initialized)
      const fn = level === 'error' ? console.error : console.warn;
      fn(`[ExceptionFilter] [${level.toUpperCase()}] ${message}`, meta);
    }
  }

  private buildErrorPayload(status: number, res: string | object): object {
    // Custom error format with { Error: [...] }
    if (res && typeof res === 'object' && 'Error' in res) {
      return {
        status,
        message: this.getMessageByStatus(status),
        error: (res as any).Error,
      };
    }

    let payload: any =
      typeof res === 'object' ? ((res as any).message ?? res) : res;

    // Try to parse stringified JSON
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try { payload = JSON.parse(trimmed); } catch { /* leave as string */ }
      }
    }

    const normalizedErrors = this.normalizeValidationPayload(payload).map((e) => ({
      field: e.field,
      body: String(e.body),
    }));

    const errorResponse = normalizedErrors.length === 1 ? normalizedErrors[0] : normalizedErrors;

    const customMessage =
      typeof payload === 'string' && payload.trim() && payload !== 'Bad Request'
        ? payload.trim()
        : this.getMessageByStatus(status);

    return {
      status,
      message: customMessage,
      error: errorResponse,
    };
  }

  private getMessageByStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:         return 'Validation error';
      case HttpStatus.UNAUTHORIZED:        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:           return 'Access denied';
      case HttpStatus.NOT_FOUND:           return 'Resource not found';
      case HttpStatus.CONFLICT:            return 'Conflict';
      case HttpStatus.TOO_MANY_REQUESTS:   return 'Too many requests';
      case HttpStatus.INTERNAL_SERVER_ERROR: return 'Internal server error';
      default:                             return 'Request failed';
    }
  }

  private normalizeValidationPayload(payload: any): Array<{ field: string; body: string }> {
    if (Array.isArray(payload) && payload.every((p) => typeof p === 'string')) {
      return (payload as string[]).map((msg) => ({ field: 'general', body: msg }));
    }

    if (Array.isArray(payload) && payload.some((p) => this.looksLikeValidationError(p))) {
      return this.flattenValidationErrors(payload as ValidationError[]);
    }

    if (payload && typeof payload === 'object') {
      const field = (payload as any).field || (payload as any).property || 'general';
      const body = (payload as any).body || (payload as any).message || JSON.stringify(payload);
      return [{ field, body: String(body) }];
    }

    return [{ field: 'general', body: String(payload) }];
  }

  private looksLikeValidationError(val: any): boolean {
    return (
      val &&
      typeof val === 'object' &&
      ('constraints' in val || 'children' in val) &&
      'property' in val
    );
  }

  private flattenValidationErrors(
    errors: ValidationError[],
    parentPath: string[] = [],
  ): Array<{ field: string; body: string }> {
    const result: Array<{ field: string; body: string }> = [];
    for (const err of errors) {
      const path = [...parentPath, err.property].filter(Boolean);
      if (err.constraints && typeof err.constraints === 'object') {
        for (const key of Object.keys(err.constraints)) {
          result.push({ field: path.join('.') || 'general', body: err.constraints[key] });
        }
      }
      if (Array.isArray(err.children) && err.children.length) {
        result.push(...this.flattenValidationErrors(err.children as ValidationError[], path));
      }
    }
    return result.length
      ? result
      : [{ field: parentPath.join('.') || 'general', body: 'Validation failed' }];
  }
}
