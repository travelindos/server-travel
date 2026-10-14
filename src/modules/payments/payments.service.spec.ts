import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpException, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { BookToursService } from '../book-tours/book-tours.service';
import { BookMotorsService } from '../book-motors/book-motors.service';
import { BookEntertainmentAttractionsService } from '../book-entertainment-attractions/book-entertainment-attractions.service';
import { BookDocumentVisasService } from '../book-document-visas/book-document-visas.service';
import { UsersService } from '../users/users.service';
import { PaypalService } from './paypal.service';
import { TouristsService } from '../tourists/tourists.service';
import { EmailService } from '../../common/emails/emails.service';
import { ServiceType } from './entities/service-type.enum';

describe('PaymentsService Unit Tests', () => {
  let service: PaymentsService;
  let paymentsRepo: any;
  let customerRepo: any;
  let bookToursService: any;
  let bookMotorsService: any;
  let bookDocumentVisasService: any;
  let paypalService: any;
  let logger: any;

  beforeEach(async () => {
    paymentsRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: 'pay_test123', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    customerRepo = {
      findOne: jest.fn(),
    };

    bookToursService = {
      findBookTourId: jest.fn(),
      updateStatusBookTour: jest.fn().mockResolvedValue(true),
    };

    bookMotorsService = {
      findOne: jest.fn(),
    };

    bookDocumentVisasService = {
      findOne: jest.fn(),
    };

    paypalService = {
      authPaypal: jest.fn().mockResolvedValue('fake_access_token'),
      capturePayment: jest.fn(),
    };

    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: logger },
        { provide: getRepositoryToken(Payment), useValue: paymentsRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: BookToursService, useValue: bookToursService },
        { provide: BookMotorsService, useValue: bookMotorsService },
        { provide: BookEntertainmentAttractionsService, useValue: {} },
        { provide: BookDocumentVisasService, useValue: bookDocumentVisasService },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: PaypalService, useValue: paypalService },
        { provide: TouristsService, useValue: {} },
        { provide: EmailService, useValue: { sendOrderEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should throw BAD_REQUEST if no booking ID is provided', async () => {
      await expect(
        service.createPayment('user_123', {
          payment_method: PaymentMethod.PAYPAL,
          currency: 'USD',
        } as any),
      ).rejects.toThrow(HttpException);
    });

    it('should throw NOT_FOUND if customer or user does not exist', async () => {
      customerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPayment('user_123', {
          book_tour_id: 'tour_123',
          payment_method: PaymentMethod.PAYPAL,
          currency: 'USD',
        } as any),
      ).rejects.toThrow(new HttpException('Customer or user not found', HttpStatus.NOT_FOUND));
    });

    it('should reuse active PENDING payment if created recently (domain guard)', async () => {
      customerRepo.findOne.mockResolvedValue({ id: 'cust_123', email: 'test@example.com' });
      bookToursService.findBookTourId.mockResolvedValue({
        data: {
          id: 'tour_123',
          customer_id: 'cust_123',
          status: 'pending',
          total: 500000,
        },
      });

      const mockExistingPayment: Partial<Payment> = {
        id: 'pay_existing123',
        invoice_code: 'INV-TOUR-001-14-10-2026',
        amount: 500000,
        currency: 'IDR',
        service_type: ServiceType.TOUR,
        payment_method: PaymentMethod.PAYPAL,
        status: PaymentStatus.PENDING,
        redirect_url: 'https://paypal.com/checkout?token=123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      paymentsRepo.findOne.mockResolvedValue(mockExistingPayment);

      const result = await service.createPayment('cust_123', {
        book_tour_id: 'tour_123',
        payment_method: PaymentMethod.PAYPAL,
        currency: 'IDR',
      });

      expect(result.message).toBe('Active payment retrieved successfully');
      expect(result.data?.id).toBe('pay_existing123');
      expect(result.data?.redirect_url).toBe('https://paypal.com/checkout?token=123');
      // Verify paymentsRepo.create was NOT called since active payment was reused
      expect(paymentsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('capturePayment', () => {
    it('should return already captured status if payment status is SUCCES', async () => {
      const mockPayment: Partial<Payment> = {
        id: 'pay_123',
        invoice_code: 'INV-TOUR-001-14-10-2026',
        status: PaymentStatus.SUCCES,
        amount: 100,
        currency: 'USD',
        payment_method: PaymentMethod.PAYPAL,
      };

      paymentsRepo.findOne.mockResolvedValue(mockPayment);

      const result = await service.capturePayment('order_paypal_123');

      expect(result.message).toBe('Payment already captured successfully');
      expect(result.data?.status).toBe(PaymentStatus.SUCCES);
      expect(paypalService.capturePayment).not.toHaveBeenCalled();
    });
  });
});
