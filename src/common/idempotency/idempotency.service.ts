import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import {
  IdempotencyKey,
  IdempotencyStatus,
} from './entities/idempotency-key.entity';

export interface IdempotencyCheckResult {
  isReplay: boolean;
  recordId?: string;
  statusCode?: number | null;
  cachedResponse?: any;
}

const KEY_FORMAT = /^[A-Za-z0-9_-]{8,64}$/;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
// A PROCESSING lock older than this is treated as a crashed request
const STALE_LOCK_MS = 2 * 60 * 1000;

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repo: Repository<IdempotencyKey>,
  ) {}

  // Deterministic JSON (sorted keys) so key order in the body doesn't change the hash
  private canonicalize(value: any): any {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((v) => this.canonicalize(v));
    return Object.keys(value)
      .sort()
      .reduce((acc: Record<string, any>, k) => {
        acc[k] = this.canonicalize(value[k]);
        return acc;
      }, {});
  }

  private hash(payload: any): string {
    return createHash('sha256')
      .update(JSON.stringify(this.canonicalize(payload ?? {})))
      .digest('hex');
  }

  /**
   * Returns a cached response (replay) or acquires the lock for a new request.
   * The unique (user_id, key) constraint makes the lock atomic.
   */
  async begin(
    userId: string,
    rawKey: string,
    path: string,
    method: string,
    payload: any,
  ): Promise<IdempotencyCheckResult> {
    const key = rawKey.trim();
    if (!KEY_FORMAT.test(key)) {
      throw new BadRequestException(
        'Invalid Idempotency-Key. Use 8-64 characters (letters, digits, "-" or "_"); a UUID is recommended.',
      );
    }

    const requestHash = this.hash(payload);
    let existing = await this.repo.findOne({ where: { user_id: userId, key } });

    // Expired record: remove it and treat the key as new
    if (existing && existing.expires_at.getTime() < Date.now()) {
      await this.repo.delete(existing.id);
      existing = null;
    }

    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new ConflictException(
          'Idempotency-Key has already been used with a different request.',
        );
      }

      if (existing.status === IdempotencyStatus.COMPLETED) {
        return {
          isReplay: true,
          statusCode: existing.response_code,
          cachedResponse: existing.response_body,
        };
      }

      // PROCESSING: another request with this key is in flight
      const lockAge = Date.now() - existing.updated_at.getTime();
      if (lockAge < STALE_LOCK_MS) {
        throw new ConflictException(
          'A request with this Idempotency-Key is still being processed. Please retry shortly.',
        );
      }
      // Stale lock (crashed request): take it over
      await this.repo.update(existing.id, { updated_at: new Date() });
      return { isReplay: false, recordId: existing.id };
    }

    try {
      const saved = await this.repo.save(
        this.repo.create({
          user_id: userId,
          key,
          request_path: path,
          request_method: method,
          request_hash: requestHash,
          status: IdempotencyStatus.PROCESSING,
          expires_at: new Date(Date.now() + TTL_MS),
        }),
      );
      return { isReplay: false, recordId: saved.id };
    } catch (error: any) {
      // Lost the race to a concurrent request with the same key
      if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
        throw new ConflictException(
          'A request with this Idempotency-Key is still being processed. Please retry shortly.',
        );
      }
      throw error;
    }
  }

  async complete(
    recordId: string,
    statusCode: number,
    body: any,
  ): Promise<void> {
    await this.repo.update(recordId, {
      status: IdempotencyStatus.COMPLETED,
      response_code: statusCode,
      response_body: body,
    });
  }

  // Failed requests are not cached, so the client can retry with the same key
  async release(recordId: string): Promise<void> {
    await this.repo.delete(recordId);
  }

  // Optional housekeeping, safe to call from a scheduled job later
  async purgeExpired(): Promise<void> {
    await this.repo.delete({ expires_at: LessThan(new Date()) });
  }
}
