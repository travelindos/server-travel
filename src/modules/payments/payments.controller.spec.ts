import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const mockPaymentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    captureOrder: jest.fn(),
  };

  const mockIdempotencyService = {
    getLockOrExisting: jest.fn(),
    complete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotencyService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
