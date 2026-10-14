import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { IdempotencyInterceptor } from '../idempotency.interceptor';

/** Protects a POST route with Idempotency-Key handling. */
export function Idempotent() {
  return applyDecorators(UseInterceptors(IdempotencyInterceptor));
}
