import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyKey, IdempotencyStatus } from './entities/idempotency-key.entity';

describe('IdempotencyService Unit Tests', () => {
  let service: IdempotencyService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ id: 'idemp_123', ...entity })),
      create: jest.fn((dto) => dto),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        { provide: getRepositoryToken(IdempotencyKey), useValue: repo },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('begin', () => {
    it('should throw BadRequestException if key is invalid or too short', async () => {
      await expect(
        service.begin('user_1', 'short', '/payments', 'POST', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should acquire lock for a fresh key', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.begin(
        'user_1',
        'valid-uuid-key-12345678',
        '/payments',
        'POST',
        { amount: 100 },
      );

      expect(result.isReplay).toBe(false);
      expect(result.recordId).toBe('idemp_123');
      expect(repo.save).toHaveBeenCalled();
    });

    it('should return cached response if key is already COMPLETED with same payload', async () => {
      // Calculate matching hash
      const payload = { amount: 100 };
      const matchingHash = (service as any).hash(payload);

      repo.findOne.mockResolvedValue({
        id: 'idemp_123',
        status: IdempotencyStatus.COMPLETED,
        request_hash: matchingHash,
        response_code: 201,
        response_body: { message: 'Success' },
        expires_at: new Date(Date.now() + 100000),
      });

      const result = await service.begin(
        'user_1',
        'valid-uuid-key-12345678',
        '/payments',
        'POST',
        payload,
      );

      expect(result.isReplay).toBe(true);
      expect(result.statusCode).toBe(201);
      expect(result.cachedResponse).toEqual({ message: 'Success' });
    });

    it('should throw ConflictException if key is reused with different payload', async () => {
      repo.findOne.mockResolvedValue({
        id: 'idemp_123',
        status: IdempotencyStatus.COMPLETED,
        request_hash: 'different_hash_value',
        expires_at: new Date(Date.now() + 100000),
      });

      await expect(
        service.begin(
          'user_1',
          'valid-uuid-key-12345678',
          '/payments',
          'POST',
          { amount: 500 },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if key is still PROCESSING (concurrent click)', async () => {
      const payload = { amount: 100 };
      const matchingHash = (service as any).hash(payload);

      repo.findOne.mockResolvedValue({
        id: 'idemp_123',
        status: IdempotencyStatus.PROCESSING,
        request_hash: matchingHash,
        updated_at: new Date(), // Just now
        expires_at: new Date(Date.now() + 100000),
      });

      await expect(
        service.begin(
          'user_1',
          'valid-uuid-key-12345678',
          '/payments',
          'POST',
          payload,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('complete and release', () => {
    it('should update record to COMPLETED', async () => {
      await service.complete('idemp_123', 201, { data: 'ok' });
      expect(repo.update).toHaveBeenCalledWith('idemp_123', {
        status: IdempotencyStatus.COMPLETED,
        response_code: 201,
        response_body: { data: 'ok' },
      });
    });

    it('should release record on error', async () => {
      await service.release('idemp_123');
      expect(repo.delete).toHaveBeenCalledWith('idemp_123');
    });
  });
});
