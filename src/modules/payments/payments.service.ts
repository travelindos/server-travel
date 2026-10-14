import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EmailService } from '../../common/emails/emails.service';
import { EmailType } from '../../types/email.type';
import { PaymentResponse } from '../../types/response/payment.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { BookToursService } from '../book-tours/book-tours.service';
import { BookMotorsService } from '../book-motors/book-motors.service';
import { BookEntertainmentAttractionsService } from '../book-entertainment-attractions/book-entertainment-attractions.service';
import { BookDocumentVisasService } from '../book-document-visas/book-document-visas.service';
import { StatusBookTour } from '../book-tours/entities/book-tour.entity';
import { StatusBookMotor } from '../book-motors/entities/book-motor.entity';
import { StatusBookEntertainmentAttraction } from '../book-entertainment-attractions/entities/book-entertainment-attraction.entity';
import { StatusBookDocumentVisa } from '../book-document-visas/entities/book-document-visa.entity';
import { TouristsService } from '../tourists/tourists.service';
import { UsersService } from '../users/users.service';
import { Customer } from '../customers/entities/customer.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from './entities/payment.entity';
import { ServiceType } from './entities/service-type.enum';
import { PaypalService } from './paypal.service';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly bookToursService: BookToursService,
    private readonly bookMotorsService: BookMotorsService,
    private readonly bookEntertainmentAttractionsService: BookEntertainmentAttractionsService,
    private readonly bookDocumentVisasService: BookDocumentVisasService,
    private readonly usersService: UsersService,
    private readonly paypalService: PaypalService,
    private readonly touristService: TouristsService,
    private readonly emailService: EmailService,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}
  // Cache for exchange rates (to avoid excessive API calls)
  private exchangeRateCache: {
    rate: number;
    timestamp: number;
    fromCurrency: string;
    toCurrency: string;
  } | null = null;
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds

  /**
   * Fetch exchange rate from external API
   * Using ExchangeRate-API (free tier: 1500 requests/month)
   * Alternative: https://api.exchangerate-api.com/v4/latest/USD
   */
  private async fetchExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    try {
      const normalizedFrom = fromCurrency.toUpperCase();
      const normalizedTo = toCurrency.toUpperCase();

      // Check cache first
      if (
        this.exchangeRateCache &&
        this.exchangeRateCache.fromCurrency === normalizedFrom &&
        this.exchangeRateCache.toCurrency === normalizedTo &&
        Date.now() - this.exchangeRateCache.timestamp < this.CACHE_DURATION
      ) {
        this.logger.debug(
          `Using cached exchange rate: 1 ${normalizedFrom} = ${this.exchangeRateCache.rate} ${normalizedTo}`,
        );
        return this.exchangeRateCache.rate;
      }

      // Fetch from API
      this.logger.debug(
        `Fetching exchange rate from API: ${normalizedFrom} to ${normalizedTo}`,
      );

      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${normalizedFrom}`,
      );

      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rate = data.rates[normalizedTo];

      if (!rate) {
        throw new Error(
          `Exchange rate not found for ${normalizedFrom} to ${normalizedTo}`,
        );
      }

      // Cache the result
      this.exchangeRateCache = {
        rate,
        timestamp: Date.now(),
        fromCurrency: normalizedFrom,
        toCurrency: normalizedTo,
      };

      this.logger.debug(
        `Fetched exchange rate: 1 ${normalizedFrom} = ${rate} ${normalizedTo}`,
      );

      return rate;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch exchange rate: ${error.message}. Using fallback rate.`,
      );
      // Fallback to approximate rate if API fails
      if (
        fromCurrency.toUpperCase() === 'IDR' &&
        toCurrency.toUpperCase() === 'USD'
      ) {
        return 1 / 15000; // Approximate fallback
      } else if (
        fromCurrency.toUpperCase() === 'USD' &&
        toCurrency.toUpperCase() === 'IDR'
      ) {
        return 15000; // Approximate fallback
      }
      return 1; // Same currency fallback
    }
  }

  /**
   * Convert amount from one currency to another using live exchange rates
   */
  private async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    const normalizedFrom = fromCurrency?.toUpperCase();
    const normalizedTo = toCurrency?.toUpperCase();

    // If same currency, no conversion needed
    if (normalizedFrom === normalizedTo) {
      return amount;
    }

    // Get exchange rate
    const rate = await this.fetchExchangeRate(normalizedFrom, normalizedTo);
    const convertedAmount = amount * rate;

    this.logger.debug(
      `Converted ${amount} ${normalizedFrom} to ${convertedAmount.toFixed(2)} ${normalizedTo} (rate: ${rate})`,
    );

    return convertedAmount;
  }

  // Helper method to convert currency (backward compatibility)
  private async convertToUSD(
    amount: number,
    fromCurrency: string,
  ): Promise<number> {
    return this.convertCurrency(amount, fromCurrency, 'USD');
  }

  private async payPalOrder(
    orderId: string,
    amount: number,
    currency: string = 'IDR',
    exchangeRate?: number, // Optional exchange rate from frontend
  ) {
    // Dapatkan token akses dari PayPal
    const accessToken = await this.paypalService.authPaypal();

    // Log currency conversion

    // Use exchange rate from frontend if provided, otherwise use convertToUSD
    let convertedAmount: number;
    if (exchangeRate && currency.toUpperCase() === 'IDR') {
      convertedAmount = amount * exchangeRate;
    } else {
      convertedAmount = await this.convertToUSD(amount, currency);
    }

    const payPalHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      // Unique per payment row, so a retried PayPal call never creates a second order
      'PayPal-Request-Id': `order_${orderId}`,
    };

    // buat order paypal
    const orderResponse = await fetch(
      `${process.env.PAYPAL_API}/v2/checkout/orders`,
      {
        method: 'POST',
        headers: payPalHeaders,
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: convertedAmount.toFixed(2),
              },
              description: `Order ID: ${orderId}`,
            },
          ],
          application_context: {
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:3200'}/en/payments/success/`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3200'}/en/payments/`,
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            brand_name: 'PacificTravelindo',
          },
        }),
      },
    );

    const orderData = await orderResponse.json();
    if (!orderResponse.ok) {
      throw new Error(`PayPal Order Error: ${JSON.stringify(orderData)}`);
    }

    const payerEmail =
      orderData?.purchase_units?.[0]?.payee?.email_address || null;

    // Return approval link untuk redirect user
    return {
      approval_url: orderData.links.find((link: any) => link.rel === 'approve')
        .href,
      paypal_order_id: orderData.id,
      payer_email: payerEmail,
      orderData,
    };
  }

  // Map ServiceType → invoice prefix
  private getServicePrefix(serviceType: ServiceType): string {
    switch (serviceType) {
      case ServiceType.TOUR:
        return 'TOUR';
      case ServiceType.RENT_MOTOR:
        return 'RENMTR';
      case ServiceType.ENTERTAINMENT:
        return 'ENTRMN';
      case ServiceType.DOCUMENT_VISA:
        return 'DOCVISA';
      case ServiceType.HEALTH_TOURISM:
        return 'HLTOURS';
      case ServiceType.HOTEL:
        return 'HTL';
      case ServiceType.SHUTTLE_BUS:
        return 'SHTL';
      case ServiceType.FLIGHT:
        return 'FLGHT';
      default:
        return 'GEN';
    }
  }

  // Generate invoice code: INV-[SERVICE]-NNN-DD-MM-YYYY
  // The sequence counter is scoped per service type so each service
  // starts its own independent series (TOUR-001, RENMTR-001, …)
  private async generateOrderCode(serviceType: ServiceType): Promise<string> {
    const prefix = this.getServicePrefix(serviceType);

    // Count existing payments for the same service type to get the next sequence
    const count = await this.paymentsRepository.count({
      where: { service_type: serviceType },
    });
    const sequence = String(count + 1).padStart(3, '0');

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());

    return `INV-${prefix}-${sequence}-${dd}-${mm}-${yyyy}`;
  }

  private toExistingPaymentResponse(
    payment: Payment,
    customerId: string | null | undefined,
    message: string,
  ): PaymentResponse {
    return {
      message,
      data: {
        id: payment.id,
        customer_id: customerId || payment.customer?.id || undefined,
        invoice_code: payment.invoice_code,
        book_tour_id: payment.bookTour?.id,
        book_motor_id: payment.bookMotor?.id,
        book_entertainment_attraction_id: payment.bookEntertainmentAttraction?.id,
        book_document_visa_id: payment.bookDocumentVisa?.id,
        total_tourists: payment.total_tourists,
        amount: payment.amount,
        currency: payment.currency,
        service_type: payment.service_type,
        status: payment.status,
        payment_method: payment.payment_method,
        redirect_url: payment.redirect_url,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      },
    };
  }

  // Create payment
  async createPayment(
    user_id: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    try {
      const {
        book_tour_id,
        book_motor_id,
        book_entertainment_attraction_id,
        book_document_visa_id,
        currency,
        payment_method,
        exchange_rate,
      } = createPaymentDto;

      if (
        !book_tour_id &&
        !book_motor_id &&
        !book_entertainment_attraction_id &&
        !book_document_visa_id
      ) {
        throw new HttpException('Booking ID is required', HttpStatus.BAD_REQUEST);
      }

      // 1. Validasi User / Customer
      const findCustomer = await this.customerRepository.findOne({ where: { id: user_id } });
      let findUser: any = null;
      if (!findCustomer) {
        try {
          findUser = await this.usersService.findById(user_id);
        } catch {
          findUser = null;
        }
      }
      if (!findCustomer && !findUser) {
        throw new HttpException('Customer or user not found', HttpStatus.NOT_FOUND);
      }

      let totalAmount = 0;
      let serviceType: ServiceType;
      let bookingData: any;

      // 2. Load Booking Data & Calculate Amount
      if (book_tour_id) {
        const findBookTour = await this.bookToursService.findBookTourId(
          book_tour_id,
          user_id,
        );

        if (!findBookTour || findBookTour.data.customer_id !== user_id) {
          throw new HttpException('Book tour not found', HttpStatus.NOT_FOUND);
        }

        if (findBookTour.data.status !== StatusBookTour.PENDING) {
          throw new HttpException(
            'Book tour is already paid or cancelled',
            HttpStatus.BAD_REQUEST,
          );
        }

        totalAmount = Number(findBookTour.data.total || findBookTour.data.subtotal || 0);
        serviceType = ServiceType.TOUR;
        bookingData = findBookTour.data;
      } else if (book_motor_id) {
        const findBookMotor = await this.bookMotorsService.findOne(book_motor_id);

        const bookingOwnerId =
          findBookMotor?.data?.customer_id || findBookMotor?.data?.user_id;

        if (!findBookMotor || (bookingOwnerId && bookingOwnerId !== user_id)) {
          throw new HttpException('Book motor not found', HttpStatus.NOT_FOUND);
        }

        if (findBookMotor.data.status === StatusBookMotor.EXPIRED) {
          throw new HttpException(
            'Book motor has expired. Please create a new booking.',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (findBookMotor.data.status === StatusBookMotor.CANCELLED) {
          throw new HttpException(
            'Book motor has been cancelled.',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (
          findBookMotor.data.status !== StatusBookMotor.PENDING &&
          findBookMotor.data.status !== StatusBookMotor.DRAFT
        ) {
          throw new HttpException('Book motor is already paid or confirmed', HttpStatus.BAD_REQUEST);
        }

        totalAmount = Number(findBookMotor.data.total_price || 0);
        serviceType = ServiceType.RENT_MOTOR;
        bookingData = findBookMotor.data;
      } else if (book_entertainment_attraction_id) {
        const findBookEntertainment =
          await this.bookEntertainmentAttractionsService.findOne(
            book_entertainment_attraction_id,
          );

        if (
          !findBookEntertainment ||
          (findBookEntertainment.data?.customer_id &&
            findBookEntertainment.data.customer_id !== user_id)
        ) {
          throw new HttpException(
            'Book entertainment attraction not found',
            HttpStatus.NOT_FOUND,
          );
        }

        if (
          findBookEntertainment.data.status !==
          StatusBookEntertainmentAttraction.PENDING
        ) {
          throw new HttpException(
            'Book entertainment attraction is already paid or cancelled',
            HttpStatus.BAD_REQUEST,
          );
        }

        totalAmount = Number(findBookEntertainment.data.subtotal || 0);
        serviceType = ServiceType.ENTERTAINMENT;
        bookingData = findBookEntertainment.data;
      } else if (book_document_visa_id) {
        const findBookVisa = await this.bookDocumentVisasService.findOne(
          book_document_visa_id,
          user_id,
        );

        if (!findBookVisa || !findBookVisa.data) {
          throw new HttpException('Book document visa not found', HttpStatus.NOT_FOUND);
        }

        if (
          findBookVisa.data.status !== StatusBookDocumentVisa.PENDING &&
          findBookVisa.data.status !== StatusBookDocumentVisa.DRAFT
        ) {
          throw new HttpException(
            'Book document visa is already paid or cancelled',
            HttpStatus.BAD_REQUEST,
          );
        }

        totalAmount = Number(findBookVisa.data.total_price || 0);
        serviceType = ServiceType.DOCUMENT_VISA;
        bookingData = findBookVisa.data;
      }

      const customerId =
        findCustomer?.id ||
        (bookingData as any)?.customer?.id ||
        (bookingData as any)?.customer_id ||
        null;

      // 2b. Check for existing active PENDING payment for this booking (Domain Idempotency Guard)
      const existingActivePayment = await this.paymentsRepository.findOne({
        where: [
          book_tour_id ? { bookTour: { id: book_tour_id }, status: PaymentStatus.PENDING } : null,
          book_motor_id ? { bookMotor: { id: book_motor_id }, status: PaymentStatus.PENDING } : null,
          book_entertainment_attraction_id ? { bookEntertainmentAttraction: { id: book_entertainment_attraction_id }, status: PaymentStatus.PENDING } : null,
          book_document_visa_id ? { bookDocumentVisa: { id: book_document_visa_id }, status: PaymentStatus.PENDING } : null,
        ].filter(Boolean) as any,
        relations: [
          'bookTour',
          'bookMotor',
          'bookEntertainmentAttraction',
          'bookDocumentVisa',
        ],
        order: { created_at: 'DESC' },
      });

      if (existingActivePayment && existingActivePayment.redirect_url) {
        const ageMinutes = (Date.now() - new Date(existingActivePayment.created_at).getTime()) / (1000 * 60);
        // If created within last 60 minutes and payment method matches, reuse the active pending payment
        if (ageMinutes < 60 && existingActivePayment.payment_method === payment_method) {
          this.logger.info(
            `Reusing active pending payment ${existingActivePayment.invoice_code} for booking (idempotency guard)`,
          );
          return this.toExistingPaymentResponse(
            existingActivePayment,
            customerId,
            'Active payment retrieved successfully',
          );
        }
      }

      // 3. Generate Invoice Code
      const invoiceCode = await this.generateOrderCode(serviceType);

      // 4. Create Payment Entity
      const newPayment = this.paymentsRepository.create({
        user: findUser ? ({ id: user_id } as any) : null,
        customer: customerId ? ({ id: customerId } as any) : null,
        bookTour: book_tour_id ? ({ id: book_tour_id } as any) : null,
        bookMotor: book_motor_id ? ({ id: book_motor_id } as any) : null,
        bookEntertainmentAttraction: book_entertainment_attraction_id
          ? ({ id: book_entertainment_attraction_id } as any)
          : null,
        bookDocumentVisa: book_document_visa_id
          ? ({ id: book_document_visa_id } as any)
          : null,
        currency: currency,
        payment_method: payment_method,
        amount: totalAmount,
        invoice_code: invoiceCode,
        service_type: serviceType as ServiceType,
        total_tourists: book_tour_id
          ? (bookingData.tourists?.length || 1)
          : book_motor_id
            ? (bookingData.book_motor_items?.length || 1)
            : book_document_visa_id
              ? (bookingData.applicant_count || bookingData.applicants?.length || 1)
              : (bookingData.tourists?.length ||
                bookingData.book_entertainment_attraction_items?.length ||
                1),
      });
      await this.paymentsRepository.save(newPayment);

      // 5. Update Booking Status to PENDING (if it was DRAFT)
      if (book_tour_id) {
        await this.bookToursService.updateStatusBookTour(book_tour_id, StatusBookTour.PENDING);
      }
      // Motor and Entertainment are already PENDING by default in create

      // 6. PayPal Logic
      let paymentPaypal: any;
      if (newPayment.payment_method === PaymentMethod.PAYPAL) {
        paymentPaypal = await this.payPalOrder(
          newPayment.id,
          newPayment.amount,
          newPayment.currency,
          exchange_rate,
        );
        await this.paymentsRepository.update(newPayment.id, {
          redirect_url: paymentPaypal.approval_url,
          transactionId: paymentPaypal.paypal_order_id,
        });
      }

      // 7. Email Logic (Simplified/Generic) - Optimized: Fire and Forget
      (async () => {
        try {
          let totalAmountUSD: number | undefined;
          let rate: number | undefined;

          if (payment_method === PaymentMethod.PAYPAL && currency?.toUpperCase() !== 'USD') {
            if (exchange_rate) {
              rate = 1 / exchange_rate;
              totalAmountUSD = totalAmount * exchange_rate;
            } else {
              totalAmountUSD = await this.convertToUSD(totalAmount, currency);
            }
          }

          // Generate dynamic details based on service type
          const itemsToPass = book_tour_id
            ? (bookingData.itinerary?.itinerary_items || [])
            : book_motor_id
              ? (bookingData.book_motor_items || [])
              : book_entertainment_attraction_id
                ? (bookingData.book_entertainment_attraction_items || [])
                : (bookingData.items || []);

          const orderDetails = await this.generateOrderDetailsHTML(
            itemsToPass,
            serviceType as ServiceType,
            currency,
            exchange_rate,
            bookingData.booking_add_ons,
          );

          const recipientEmail =
            findCustomer?.email ||
            findUser?.data?.email ||
            (bookingData as any)?.booker?.email ||
            (bookingData as any)?.customer?.email ||
            (bookingData as any)?.customer_email ||
            (bookingData as any)?.booker_email;

          if (recipientEmail) {
            await this.emailService.sendOrderEmail(EmailType.SUCCESS_BOOKING, {
              email: recipientEmail,
              orderCode: newPayment.invoice_code,
              orderDetails,
              totalAmount: totalAmount,
              totalAmountUSD,
              currency: newPayment.currency,
              exchangeRate: rate,
              paymentMethod: newPayment.payment_method,
              links: paymentPaypal?.approval_url || undefined,
            });
          }
        } catch (emailError: any) {
          this.logger.error(`Failed to send booking email: ${emailError.message}`);
        }
      })();

      return {
        message: 'Success creating payment',
        data: {
          id: newPayment.id,
          customer_id: customerId || undefined,
          invoice_code: newPayment.invoice_code,
          book_tour_id: newPayment.bookTour?.id,
          book_motor_id: newPayment.bookMotor?.id,
          book_entertainment_attraction_id:
            newPayment.bookEntertainmentAttraction?.id,
          book_document_visa_id: newPayment.bookDocumentVisa?.id,
          total_tourists: newPayment.total_tourists,
          amount: newPayment.amount,
          currency: newPayment.currency,
          service_type: newPayment.service_type,
          status: newPayment.status,
          payment_method: newPayment.payment_method,
          transaction_id: paymentPaypal?.paypal_order_id || null,
          redirect_url: paymentPaypal?.approval_url || null,
          created_at: newPayment.created_at,
          updated_at: newPayment.updated_at,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error creating payment: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // capture payment
  async capturePayment(orderId: string): Promise<PaymentResponse> {
    try {
      const payment = await this.paymentsRepository.findOne({
        where: { transactionId: orderId },
        relations: [
          'user',
          'customer',
          'bookTour',
          'bookTour.customer',
          'bookTour.booker',
          'bookMotor',
          'bookMotor.user',
          'bookMotor.customer',
          'bookMotor.booker',
          'bookEntertainmentAttraction',
          'bookEntertainmentAttraction.customer',
          'bookDocumentVisa',
          'bookDocumentVisa.customer',
          'bookDocumentVisa.booker',
        ],
      });

      if (!payment) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      if (payment.status === PaymentStatus.SUCCES) {
        const customerId =
          payment.customer?.id ||
          payment.bookDocumentVisa?.customer?.id ||
          payment.bookTour?.customer?.id ||
          payment.bookMotor?.customer?.id ||
          payment.bookEntertainmentAttraction?.customer?.id ||
          (payment as any).customer_id ||
          '';

        return {
          message: 'Payment already captured successfully',
          data: {
            id: payment.id,
            customer_id: customerId,
            invoice_code: payment.invoice_code,
            book_tour_id: payment.bookTour?.id,
            book_motor_id: payment.bookMotor?.id,
            book_entertainment_attraction_id:
              payment.bookEntertainmentAttraction?.id,
            book_document_visa_id: payment.bookDocumentVisa?.id,
            amount: payment.amount,
            currency: payment.currency,
            service_type: payment.service_type,
            status: PaymentStatus.SUCCES,
            payment_method: payment.payment_method,
            payer_email: payment.payer_email,
            transaction_id: orderId,
            created_at: payment.created_at,
            updated_at: payment.updated_at,
          },
        };
      }

      const capture = await this.paypalService.capturePayment(orderId);

      // update payment status
      await this.paymentsRepository.update(payment.id, {
        status: PaymentStatus.SUCCES,
        payer_email: capture.payerEmail || payment.payer_email,
        redirect_url: null,
      });

      // update booking status to CONFIRMED
      if (payment.service_type === ServiceType.TOUR && payment.bookTour) {
        await this.bookToursService.updateStatusBookTour(
          payment.bookTour.id,
          StatusBookTour.CONFIRMED,
        );
      } else if (payment.service_type === ServiceType.RENT_MOTOR && payment.bookMotor) {
        await this.bookMotorsService.updateStatus(
          payment.bookMotor.id,
          StatusBookMotor.ONGOING,
        );
      } else if (
        payment.service_type === ServiceType.ENTERTAINMENT &&
        payment.bookEntertainmentAttraction
      ) {
        await this.bookEntertainmentAttractionsService.updateStatus(
          payment.bookEntertainmentAttraction.id,
          StatusBookEntertainmentAttraction.CONFIRMED,
        );
      } else if (
        payment.service_type === ServiceType.DOCUMENT_VISA &&
        payment.bookDocumentVisa
      ) {
        await this.bookDocumentVisasService.updateStatus(
          payment.bookDocumentVisa.id,
          {
            status: StatusBookDocumentVisa.PAID,
            log_title: 'Payment Confirmed',
            log_note:
              'Pembayaran visa berhasil dikonfirmasi. Silakan hubungi Customer Service untuk konsultasi berkas persyaratan.',
          },
        );
      }

      // Send payment success email
      try {
        let bookingDetails: any;
        const customerOrUserId =
          payment.user?.id ||
          payment.bookTour?.customer?.id ||
          payment.bookMotor?.customer?.id ||
          payment.bookEntertainmentAttraction?.customer?.id ||
          (payment as any).user_id ||
          '';

        if (payment.service_type === ServiceType.TOUR && payment.bookTour) {
          bookingDetails = await this.bookToursService.findBookTourId(
            payment.bookTour.id,
            customerOrUserId,
          );
        } else if (payment.service_type === ServiceType.RENT_MOTOR && payment.bookMotor) {
          bookingDetails = await this.bookMotorsService.findOne(payment.bookMotor.id);
        } else if (
          payment.service_type === ServiceType.ENTERTAINMENT &&
          payment.bookEntertainmentAttraction
        ) {
          bookingDetails =
            await this.bookEntertainmentAttractionsService.findOne(
              payment.bookEntertainmentAttraction.id,
            );
        } else if (
          payment.service_type === ServiceType.DOCUMENT_VISA &&
          payment.bookDocumentVisa
        ) {
          bookingDetails =
            await this.bookDocumentVisasService.findOne(
              payment.bookDocumentVisa.id,
            );
        }

        // Calculate USD amount if PayPal
        let totalAmountUSD: number | undefined;
        let exchangeRate: number | undefined;

        if (
          payment.payment_method === PaymentMethod.PAYPAL &&
          payment.currency?.toUpperCase() !== 'USD'
        ) {
          totalAmountUSD = await this.convertToUSD(
            payment.amount,
            payment.currency,
          );
          // Calculate exchange rate from amounts
          if (totalAmountUSD && totalAmountUSD > 0) {
            exchangeRate = payment.amount / totalAmountUSD; // IDR per USD
          }
        }

        const itemsToPass =
          payment.service_type === ServiceType.TOUR
            ? (bookingDetails?.data?.itinerary?.itinerary_items || [])
            : payment.service_type === ServiceType.RENT_MOTOR
              ? (bookingDetails?.data?.book_motor_items || [])
              : payment.service_type === ServiceType.ENTERTAINMENT
                ? (bookingDetails?.data?.book_entertainment_attraction_items || [])
                : (bookingDetails?.data?.items || []);

        const orderDetails = await this.generateOrderDetailsHTML(
          itemsToPass,
          payment.service_type,
          payment.currency,
          exchangeRate ? 1 / exchangeRate : undefined, // Convert to USD rate
          bookingDetails?.data?.booking_add_ons,
        );

        const recipientEmail =
          payment.user?.email ||
          payment.bookTour?.customer?.email ||
          payment.bookTour?.booker?.email ||
          payment.bookMotor?.customer?.email ||
          payment.bookMotor?.booker?.email ||
          payment.bookMotor?.user?.email ||
          payment.bookEntertainmentAttraction?.customer?.email ||
          payment.bookEntertainmentAttraction?.booker?.email ||
          payment.bookDocumentVisa?.customer?.email ||
          payment.bookDocumentVisa?.booker?.email ||
          bookingDetails?.data?.customer_email ||
          bookingDetails?.data?.booker_email ||
          capture.payerEmail;

        // Fire and forget email sending
        (async () => {
          try {
            if (recipientEmail) {
              await this.emailService.sendOrderEmail(EmailType.SUCCESS_PAYMENT, {
                email: recipientEmail,
                orderCode: payment.invoice_code,
                orderDetails,
                totalAmount: payment.amount,
                totalAmountUSD,
                currency: payment.currency,
                exchangeRate,
                paymentMethod: payment.payment_method,
              });

              this.logger.debug(
                `Payment success email sent for order: ${payment.invoice_code}`,
              );
            }
          } catch (emailError: any) {
            this.logger.error(
              `Failed to send payment success email: ${emailError.message}`,
            );
          }
        })();
      } catch (emailError: any) {
        this.logger.error(
          `Failed to prepare payment success email: ${emailError.message}`,
        );
      }

      const customerId =
        payment.customer?.id ||
        payment.bookDocumentVisa?.customer?.id ||
        payment.bookTour?.customer?.id ||
        payment.bookMotor?.customer?.id ||
        payment.bookEntertainmentAttraction?.customer?.id ||
        (payment as any).customer_id ||
        '';

      return {
        message: 'Success capturing payment',
        data: {
          id: payment.id,
          customer_id: customerId,
          invoice_code: payment.invoice_code,
          book_tour_id: payment.bookTour?.id,
          book_motor_id: payment.bookMotor?.id,
          book_entertainment_attraction_id:
            payment.bookEntertainmentAttraction?.id,
          book_document_visa_id: payment.bookDocumentVisa?.id,
          amount: payment.amount,
          currency: payment.currency,
          service_type: payment.service_type,
          status: PaymentStatus.SUCCES,
          payment_method: payment.payment_method,
          payer_email: capture.payerEmail || payment.payer_email,
          transaction_id: orderId,
          created_at: payment.created_at,
          updated_at: new Date(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Error capturing payment: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // handle webhook
  async handleWebhook(payload: any): Promise<PaymentResponse | any> {
    try {
      const eventType = payload.event_type;
      this.logger.debug(`Received PayPal Webhook: ${eventType}`);
      this.logger.debug(`Webhook payload: ${JSON.stringify(payload)}`);

      // TODO: Verify webhook signature using headers
      // const webhookId = process.env.PAYPAL_WEBHOOK_ID;
      // await this.paypalService.verifyWebhookSignature(headers, payload, webhookId);

      let orderId: string | null = null;

      // Handle different PayPal webhook events
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          // Extract order ID from capture completed event
          orderId =
            payload.resource?.supplementary_data?.related_ids?.order_id ||
            payload.resource?.id;
          this.logger.debug(
            `Processing PAYMENT.CAPTURE.COMPLETED for order: ${orderId}`,
          );
          break;

        case 'CHECKOUT.ORDER.APPROVED':
          // Extract order ID from order approved event
          orderId = payload.resource?.id;
          this.logger.debug(
            `Processing CHECKOUT.ORDER.APPROVED for order: ${orderId}`,
          );
          break;

        case 'CHECKOUT.ORDER.COMPLETED':
          // Extract order ID from order completed event
          orderId = payload.resource?.id;
          this.logger.debug(
            `Processing CHECKOUT.ORDER.COMPLETED for order: ${orderId}`,
          );
          break;

        default:
          this.logger.warn(`Unhandled webhook event type: ${eventType}`);
          return { message: 'Webhook event ignored', data: null };
      }

      if (!orderId) {
        this.logger.error('Could not extract order ID from webhook payload');
        return { message: 'Order ID not found in webhook', data: null };
      }

      // Find payment by transaction ID (PayPal order ID)
      const payment = await this.paymentsRepository.findOne({
        where: { transactionId: orderId },
        relations: [
          'bookTour',
          'bookTour.customer',
          'bookTour.booker',
          'bookTour.itinerary',
          'bookTour.itinerary.itinerary_items',
          'bookMotor',
          'bookMotor.user',
          'bookMotor.customer',
          'bookMotor.booker',
          'bookEntertainmentAttraction',
          'bookEntertainmentAttraction.customer',
          'bookDocumentVisa',
          'bookDocumentVisa.customer',
          'bookDocumentVisa.booker',
          'user',
        ],
      });

      if (!payment) {
        this.logger.warn(`Payment not found for order ID: ${orderId}`);
        return { message: 'Payment not found', data: null };
      }

      // Only update if payment is not already successful
      if (payment.status !== PaymentStatus.SUCCES) {
        this.logger.debug(
          `Updating payment ${payment.id} status to SUCCESS for order ${orderId}`,
        );

        // Extract payer email from different possible locations in payload
        const payerEmail =
          payload.resource?.payer?.email_address ||
          payload.resource?.payer?.payer_info?.email ||
          null;

        await this.paymentsRepository.update(payment.id, {
          status: PaymentStatus.SUCCES,
          payer_email: payerEmail,
        });

        // Update booking status
        if (payment.service_type === ServiceType.TOUR && payment.bookTour) {
          await this.bookToursService.updateStatusBookTour(
            payment.bookTour.id,
            StatusBookTour.CONFIRMED,
          );
        } else if (payment.service_type === ServiceType.RENT_MOTOR && payment.bookMotor) {
          await this.bookMotorsService.updateStatus(
            payment.bookMotor.id,
            StatusBookMotor.ONGOING,
          );
        } else if (
          payment.service_type === ServiceType.ENTERTAINMENT &&
          payment.bookEntertainmentAttraction
        ) {
          await this.bookEntertainmentAttractionsService.updateStatus(
            payment.bookEntertainmentAttraction.id,
            StatusBookEntertainmentAttraction.CONFIRMED,
          );
        } else if (
          payment.service_type === ServiceType.DOCUMENT_VISA &&
          payment.bookDocumentVisa
        ) {
          await this.bookDocumentVisasService.updateStatus(
            payment.bookDocumentVisa.id,
            {
              status: StatusBookDocumentVisa.PAID,
              log_title: 'Payment Confirmed',
              log_note:
                'Pembayaran visa berhasil dikonfirmasi via PayPal webhook.',
            },
          );
        }

        // Send payment success email via webhook
        try {
          let bookingDetails: any;
          const customerOrUserId =
            payment.user?.id ||
            payment.bookTour?.customer?.id ||
            payment.bookEntertainmentAttraction?.customer?.id ||
            payment.bookDocumentVisa?.customer?.id ||
            (payment as any).user_id ||
            '';

          if (payment.service_type === ServiceType.TOUR && payment.bookTour) {
            bookingDetails = await this.bookToursService.findBookTourId(
              payment.bookTour.id,
              customerOrUserId,
            );
          } else if (payment.service_type === ServiceType.RENT_MOTOR && payment.bookMotor) {
            bookingDetails = await this.bookMotorsService.findOne(
              payment.bookMotor.id,
            );
          } else if (
            payment.service_type === ServiceType.ENTERTAINMENT &&
            payment.bookEntertainmentAttraction
          ) {
            bookingDetails =
              await this.bookEntertainmentAttractionsService.findOne(
                payment.bookEntertainmentAttraction.id,
              );
          } else if (
            payment.service_type === ServiceType.DOCUMENT_VISA &&
            payment.bookDocumentVisa
          ) {
            bookingDetails =
              await this.bookDocumentVisasService.findOne(
                payment.bookDocumentVisa.id,
              );
          }

          // Calculate USD amount if PayPal
          let totalAmountUSD: number | undefined;
          let exchangeRate: number | undefined;

          if (
            payment.payment_method === PaymentMethod.PAYPAL &&
            payment.currency?.toUpperCase() !== 'USD'
          ) {
            totalAmountUSD = await this.convertToUSD(
              payment.amount,
              payment.currency,
            );
            // Calculate exchange rate from amounts
            if (totalAmountUSD && totalAmountUSD > 0) {
              exchangeRate = payment.amount / totalAmountUSD; // IDR per USD
            }
          }

          const itemsToPass =
            payment.service_type === ServiceType.TOUR
              ? (bookingDetails?.data?.itinerary?.itinerary_items || [])
              : payment.service_type === ServiceType.RENT_MOTOR
                ? (bookingDetails?.data?.book_motor_items || [])
                : payment.service_type === ServiceType.ENTERTAINMENT
                  ? (bookingDetails?.data?.book_entertainment_attraction_items || [])
                  : (bookingDetails?.data?.items || []);

          const orderDetails = await this.generateOrderDetailsHTML(
            itemsToPass,
            payment.service_type,
            payment.currency,
            exchangeRate ? 1 / exchangeRate : undefined, // Convert to USD rate
            bookingDetails?.data?.booking_add_ons,
          );

          const recipientEmail =
            payment.user?.email ||
            payment.bookTour?.customer?.email ||
            payment.bookTour?.booker?.email ||
            payment.bookMotor?.customer?.email ||
            payment.bookMotor?.booker?.email ||
            payment.bookMotor?.user?.email ||
            payment.bookEntertainmentAttraction?.customer?.email ||
            payment.bookEntertainmentAttraction?.booker?.email ||
            payment.bookDocumentVisa?.customer?.email ||
            payment.bookDocumentVisa?.booker?.email ||
            bookingDetails?.data?.customer_email ||
            bookingDetails?.data?.booker_email ||
            payerEmail;

          // Fire and forget email sending via webhook
          (async () => {
            try {
              if (recipientEmail) {
                await this.emailService.sendOrderEmail(EmailType.SUCCESS_PAYMENT, {
                  email: recipientEmail,
                  orderCode: payment.invoice_code,
                  orderDetails,
                  totalAmount: payment.amount,
                  totalAmountUSD,
                  currency: payment.currency,
                  exchangeRate,
                  paymentMethod: payment.payment_method,
                });

                this.logger.debug(
                  `Payment success email sent via webhook for order: ${payment.invoice_code}`,
                );
              }
            } catch (emailError: any) {
              this.logger.error(
                `Failed to send payment success email via webhook: ${emailError.message}`,
              );
            }
          })();
        } catch (emailError: any) {
          this.logger.error(
            `Failed to prepare payment success email via webhook: ${emailError.message}`,
          );
        }

        this.logger.debug(
          `Successfully processed webhook for payment ${payment.id}`,
        );

        const customerId =
          payment.customer?.id ||
          payment.bookDocumentVisa?.customer?.id ||
          payment.bookTour?.customer?.id ||
          payment.bookMotor?.customer?.id ||
          payment.bookEntertainmentAttraction?.customer?.id ||
          (payment as any).customer_id ||
          '';

        return {
          message: 'Webhook processed successfully',
          data: {
            id: payment.id,
            customer_id: customerId,
            book_tour_id: payment.bookTour?.id || '',
            amount: payment.amount,
            currency: payment.currency,
            status: PaymentStatus.SUCCES,
            payment_method: payment.payment_method,
            payer_email: payerEmail,
            transaction_id: orderId,
            created_at: payment.created_at,
            updated_at: new Date(),
          },
        };
      } else {
        this.logger.debug(
          `Payment ${payment.id} already marked as successful, skipping update`,
        );

        const customerId =
          payment.customer?.id ||
          payment.bookDocumentVisa?.customer?.id ||
          payment.bookTour?.customer?.id ||
          payment.bookMotor?.customer?.id ||
          payment.bookEntertainmentAttraction?.customer?.id ||
          (payment as any).customer_id ||
          '';

        return {
          message: 'Payment already processed',
          data: {
            id: payment.id,
            customer_id: customerId,
            book_tour_id: payment.bookTour?.id || '',
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            payment_method: payment.payment_method,
            payer_email: payment.payer_email,
            transaction_id: orderId,
            created_at: payment.created_at,
            updated_at: payment.updated_at,
          },
        };
      }
    } catch (error: any) {
      this.logger.error(
        `Error handling webhook: ${error.message}`,
        error.stack,
      );
      // Don't throw error - we don't want to return 500 to PayPal
      // PayPal will retry if we return an error
    }
  }

  // find all payments
  async findAllPayments(userId: string): Promise<PaymentResponse> {
    this.logger.debug(`Attempting to find all payments for user: ${userId}`);
    const payments = await this.paymentsRepository.find({
      where: [
        { user: { id: userId } },
        { customer: { id: userId } },
        { bookTour: { customer: { id: userId } } },
        { bookMotor: { customer: { id: userId } } },
        { bookMotor: { user: { id: userId } } },
        { bookEntertainmentAttraction: { customer: { id: userId } } },
        { bookDocumentVisa: { customer: { id: userId } } },
      ],
      relations: [
        'customer',
        'bookTour',
        'bookTour.customer',
        'bookMotor',
        'bookMotor.customer',
        'bookEntertainmentAttraction',
        'bookEntertainmentAttraction.customer',
        'bookDocumentVisa',
        'bookDocumentVisa.customer',
        'user',
      ],
      order: { created_at: 'DESC' },
    });

    this.logger.debug(`Found ${payments?.length || 0} payments in database`);
    if (payments?.length > 0) {
      this.logger.debug(
        `First payment sample: ${JSON.stringify(payments[0])}`,
      );
    }

    if (!payments || payments.length === 0) {
      this.logger.warn('No payments found for this user/system');
      // Return empty array instead of throwing 404 to avoid frontend error state
      return {
        message: 'No payments found',
        datas: [],
      };
    }

    this.logger.debug('Successfully retrieved and mapped payments');

    return {
      message: 'Success find all payments',
      datas: payments.map((payment) => {
        const customerId =
          payment.customer?.id ||
          payment.bookDocumentVisa?.customer?.id ||
          payment.bookTour?.customer?.id ||
          payment.bookMotor?.customer?.id ||
          payment.bookEntertainmentAttraction?.customer?.id ||
          (payment as any).customer_id ||
          '';
        return {
          id: payment.id,
          customer_id: customerId,
          invoice_code: payment.invoice_code,
        book_tour_id: payment.bookTour?.id || '',
        book_motor_id: payment.bookMotor?.id || '',
        book_entertainment_attraction_id:
          payment.bookEntertainmentAttraction?.id || '',
        book_document_visa_id: payment.bookDocumentVisa?.id || '',
        total_tourists: payment.total_tourists,
        amount: payment.amount,
        currency: payment.currency,
        service_type: payment.service_type,
        transaction_id: payment.transactionId,
        payment_method: payment.payment_method,
        payer_email: payment.payer_email,
        redirect_url: payment.redirect_url,
        status: payment.status,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      };
    }),
  };
  }

  // find one payment
  async findOnePayment(id: string): Promise<PaymentResponse> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: [
        'user',
        'customer',
        'bookTour',
        'bookTour.booker',
        'bookTour.itinerary',
        'bookTour.itinerary.itinerary_items',
        'bookTour.itinerary.itinerary_items.destination',
        'bookTour.itinerary.itinerary_items.destination.translations',
        'bookTour.itinerary.itinerary_items.destination.state',
        'bookTour.itinerary.itinerary_items.destination.state.country',
        'bookTour.tourists',
        'bookMotor',
        'bookMotor.book_motor_items',
        'bookMotor.book_motor_items.motor',
        'bookMotor.book_motor_items.motor.translations',
        'bookEntertainmentAttraction',
        'bookEntertainmentAttraction.booker',
        'bookEntertainmentAttraction.book_entertainment_attraction_items',
        'bookEntertainmentAttraction.book_entertainment_attraction_items.entertainment_attraction',
        'bookEntertainmentAttraction.tourists',
        'bookDocumentVisa',
        'bookDocumentVisa.booker',
        'bookDocumentVisa.customer',
        'bookDocumentVisa.items',
        'bookDocumentVisa.applicants',
      ],
    });

    if (!payment) {
      this.logger.warn(`Payment not found for id: ${id}`);
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }

    // Auto-heal visa booking status if payment is confirmed
    if (
      (payment.status === PaymentStatus.SUCCES ||
        String(payment.status).toLowerCase() === 'paid' ||
        String(payment.status).toLowerCase() === 'success') &&
      payment.bookDocumentVisa &&
      (payment.bookDocumentVisa.status === StatusBookDocumentVisa.CANCELLED ||
        payment.bookDocumentVisa.status === StatusBookDocumentVisa.DRAFT ||
        payment.bookDocumentVisa.status === StatusBookDocumentVisa.PENDING)
    ) {
      payment.bookDocumentVisa.status = StatusBookDocumentVisa.PAID;
      try {
        await this.bookDocumentVisasService.updateStatus(
          payment.bookDocumentVisa.id,
          {
            status: StatusBookDocumentVisa.PAID,
            log_title: 'Payment Confirmed',
            log_note:
              'Status visa diperbarui ke Paid secara otomatis berdasarkan pembayaran terkonfirmasi.',
          },
        );
      } catch (err: any) {
        this.logger.error(`Error auto-syncing visa status: ${err?.message}`);
      }
    }

    const customerId =
      payment.customer?.id ||
      payment.bookDocumentVisa?.customer?.id ||
      payment.bookTour?.customer?.id ||
      payment.bookMotor?.customer?.id ||
      payment.bookEntertainmentAttraction?.customer?.id ||
      (payment as any).customer_id ||
      '';

    const customerObj =
      payment.customer
        ? {
            id: payment.customer.id,
            name: payment.customer.name,
            email: payment.customer.email,
          }
        : payment.bookDocumentVisa?.customer
          ? {
              id: payment.bookDocumentVisa.customer.id,
              name: payment.bookDocumentVisa.customer.name,
              email: payment.bookDocumentVisa.customer.email,
            }
          : payment.bookTour?.customer
            ? {
                id: payment.bookTour.customer.id,
                name: payment.bookTour.customer.name,
                email: payment.bookTour.customer.email,
              }
            : null;

    return {
      message: 'Success find payment',
      data: {
        id: payment.id,
        customer_id: customerId,
        customer: customerObj,
        user: payment.user
          ? {
              id: payment.user.id,
              name: payment.user.name,
              email: payment.user.email,
            }
          : null,
        invoice_code: payment.invoice_code,
        book_tour_id: payment.bookTour?.id,
        book_motor_id: payment.bookMotor?.id,
        book_entertainment_attraction_id:
          payment.bookEntertainmentAttraction?.id,
        book_document_visa_id: payment.bookDocumentVisa?.id,
        book_tour: payment.bookTour
          ? {
              id: payment.bookTour.id,
              code: payment.bookTour.code,
              subtotal: payment.bookTour.subtotal,
              tax: payment.bookTour.tax,
              total: payment.bookTour.total,
              status: payment.bookTour.status,
              booker: payment.bookTour.booker
                ? {
                    id: payment.bookTour.booker.id,
                    name: payment.bookTour.booker.name,
                    email: payment.bookTour.booker.email,
                    phone_number: payment.bookTour.booker.phone_number,
                  }
                : null,
              book_tour_items: (payment.bookTour.itinerary?.itinerary_items || []).map((item) => {
                const translation =
                  item.destination?.translations?.find(
                    (t) => t.language_code === 'id',
                  ) || item.destination?.translations?.[0];

                return {
                  id: item.id,
                  visit_date: item.visit_date,
                  destination: item.destination
                    ? {
                        id: item.destination.id,
                        price: item.destination.price,
                        name: translation?.name || '',
                        description: translation?.description || '',
                        detail_tour: translation?.detail_tour || [],
                        thumbnail: item.destination.thumbnail || '',
                        location: item.destination.state
                          ? `${item.destination.state.name}, ${item.destination.state.country?.name || ''}`
                          : '',
                      }
                    : null,
                };
              }),
              tourists: payment.bookTour.tourists
                ? payment.bookTour.tourists.map((tourist) => ({
                    id: tourist.id,
                    name: tourist.name,
                    gender: tourist.gender,
                    phone_number: tourist.phone_number,
                    nationality: tourist.nationality,
                    passport_number: tourist.passport_number,
                  }))
                : [],
            }
          : null,
        book_motor: payment.bookMotor
          ? {
              id: payment.bookMotor.id,
              status: payment.bookMotor.status,
            }
          : null,
        book_entertainment_attraction: payment.bookEntertainmentAttraction
          ? {
              id: payment.bookEntertainmentAttraction.id,
              status: payment.bookEntertainmentAttraction.status,
              subtotal: payment.bookEntertainmentAttraction.subtotal,
              booker: payment.bookEntertainmentAttraction.booker,
              items:
                payment.bookEntertainmentAttraction
                  .book_entertainment_attraction_items || [],
              tourists: payment.bookEntertainmentAttraction.tourists || [],
            }
          : null,
        book_document_visa: payment.bookDocumentVisa
          ? {
              id: payment.bookDocumentVisa.id,
              status: payment.bookDocumentVisa.status,
              total_price: payment.bookDocumentVisa.total_price,
              applicant_count: payment.bookDocumentVisa.applicant_count,
              booker: payment.bookDocumentVisa.booker,
              items: payment.bookDocumentVisa.items || [],
              applicants: payment.bookDocumentVisa.applicants || [],
            }
          : null,
        total_tourists: payment.total_tourists,
        amount: payment.amount,
        currency: payment.currency,
        service_type: payment.service_type,
        transaction_id: payment.transactionId,
        payment_method: payment.payment_method,
        payer_email: payment.payer_email,
        redirect_url: payment.redirect_url,
        status: payment.status,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      },
    };
  }

  // find all payment users (admin)
  async findAllPaymentUsers(): Promise<PaymentResponse> {
    const payments = await this.paymentsRepository.find({
      relations: [
        'user',
        'customer',
        'bookTour',
        'bookTour.booker',
        'bookTour.customer',
        'bookMotor',
        'bookMotor.customer',
        'bookEntertainmentAttraction',
        'bookEntertainmentAttraction.booker',
        'bookEntertainmentAttraction.customer',
        'bookDocumentVisa',
        'bookDocumentVisa.booker',
        'bookDocumentVisa.customer',
        'bookTour.itinerary',
        'bookTour.itinerary.itinerary_items',
        'bookMotor.book_motor_items',
      ],
    });

    if (!payments || payments.length === 0) {
      this.logger.warn('No payments found for this user/system');
      return {
        message: 'No payments found',
        datas: [],
      };
    }

    this.logger.debug('Successfully retrieved and mapped payments');

    return {
      message: 'Success find all payment users',
      datas: payments.map((payment) => {
        const customerId =
          payment.customer?.id ||
          payment.bookDocumentVisa?.customer?.id ||
          payment.bookTour?.customer?.id ||
          payment.bookMotor?.customer?.id ||
          payment.bookEntertainmentAttraction?.customer?.id ||
          (payment as any).customer_id ||
          '';

        return {
          id: payment.id,
          customer_id: customerId,
          customer:
            payment.customer ||
            payment.bookDocumentVisa?.customer ||
            payment.bookTour?.customer ||
            payment.bookMotor?.customer ||
            payment.bookEntertainmentAttraction?.customer ||
            null,
        user: payment.user
          ? {
              id: payment.user.id,
              name: payment.user.name,
              email: payment.user.email,
            }
          : null,
        invoice_code: payment.invoice_code,
        book_tour_id: payment.bookTour?.id,
        book_motor_id: payment.bookMotor?.id,
        book_entertainment_attraction_id:
          payment.bookEntertainmentAttraction?.id,
        book_document_visa_id: payment.bookDocumentVisa?.id,
        booker: payment.bookTour?.booker
          ? {
              id: payment.bookTour.booker.id,
              name: payment.bookTour.booker.name,
              email: payment.bookTour.booker.email,
              phone_number: payment.bookTour.booker.phone_number,
            }
          : payment.bookEntertainmentAttraction?.booker
            ? {
                id: payment.bookEntertainmentAttraction.booker.id,
                name: payment.bookEntertainmentAttraction.booker.name,
                email: payment.bookEntertainmentAttraction.booker.email,
                phone_number:
                  payment.bookEntertainmentAttraction.booker.phone_number,
              }
            : payment.bookDocumentVisa?.booker
              ? {
                  id: payment.bookDocumentVisa.booker.id,
                  name: payment.bookDocumentVisa.booker.name,
                  email: payment.bookDocumentVisa.booker.email,
                  phone_number: payment.bookDocumentVisa.booker.phone_number,
                }
              : null,
        book_tour: payment.bookTour
          ? {
              id: payment.bookTour.id,
              code: payment.bookTour.code,
              status: payment.bookTour.status,
              booker: payment.bookTour.booker
                ? {
                    id: payment.bookTour.booker.id,
                    name: payment.bookTour.booker.name,
                    email: payment.bookTour.booker.email,
                    phone_number: payment.bookTour.booker.phone_number,
                  }
                : null,
              book_tour_items: payment.bookTour.itinerary?.itinerary_items || [],
            }
          : null,
        book_motor: payment.bookMotor
          ? {
              id: payment.bookMotor.id,
              book_motor_items: payment.bookMotor.book_motor_items || [],
            }
          : null,
        book_entertainment_attraction: payment.bookEntertainmentAttraction
          ? {
              id: payment.bookEntertainmentAttraction.id,
              status: payment.bookEntertainmentAttraction.status,
              subtotal: payment.bookEntertainmentAttraction.subtotal,
            }
          : null,
        book_document_visa: payment.bookDocumentVisa
          ? {
              id: payment.bookDocumentVisa.id,
              status:
                (payment.status === PaymentStatus.SUCCES ||
                  String(payment.status).toLowerCase() === 'paid' ||
                  String(payment.status).toLowerCase() === 'success') &&
                (payment.bookDocumentVisa.status === StatusBookDocumentVisa.CANCELLED ||
                  payment.bookDocumentVisa.status === StatusBookDocumentVisa.DRAFT ||
                  payment.bookDocumentVisa.status === StatusBookDocumentVisa.PENDING)
                  ? StatusBookDocumentVisa.PAID
                  : payment.bookDocumentVisa.status,
              total_price: payment.bookDocumentVisa.total_price,
            }
          : null,
        total_tourists: payment.total_tourists,
        amount: payment.amount,
        currency: payment.currency,
        service_type: payment.service_type,
        transaction_id: payment.transactionId,
        payment_method: payment.payment_method,
        payer_email: payment.payer_email,
        redirect_url: payment.redirect_url,
        status: payment.status,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      };
    }),
  };
  }

  /**
   * Cancel a payment
   * - Only pending/draft payments can be cancelled
   * - Only the user who created the payment can cancel it
   * - Updates payment status to CANCELLED
   * - Resets book tour status to DRAFT
   * - Optionally cancels PayPal transaction if applicable
   */
  async cancelPayment(userId: string, id: string): Promise<PaymentResponse> {
    // Find payment with relations
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: [
        'user',
        'customer',
        'bookTour',
        'bookTour.customer',
        'bookMotor',
        'bookMotor.customer',
        'bookMotor.user',
        'bookEntertainmentAttraction',
        'bookEntertainmentAttraction.customer',
        'bookDocumentVisa',
        'bookDocumentVisa.customer',
      ],
    });

    if (!payment) {
      this.logger.error(`Payment not found: ${id}`);
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }

    // Authorization: Check user or customer ownership
    const isOwner =
      payment.user?.id === userId ||
      payment.customer?.id === userId ||
      payment.bookTour?.customer?.id === userId ||
      payment.bookMotor?.customer?.id === userId ||
      payment.bookMotor?.user?.id === userId ||
      payment.bookEntertainmentAttraction?.customer?.id === userId ||
      payment.bookDocumentVisa?.customer?.id === userId ||
      (payment as any).user_id === userId;

    if (!isOwner) {
      this.logger.error(
        `Unauthorized cancel attempt: User ${userId} tried to cancel payment ${id}`,
      );
      throw new HttpException(
        'You are not authorized to cancel this payment',
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if payment can be cancelled
    if (payment.status === PaymentStatus.SUCCES) {
      this.logger.error(
        `Cannot cancel completed payment: ${id}. Status: ${payment.status}`,
      );
      throw new HttpException(
        'Cannot cancel a completed payment. Please request a refund instead.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (payment.status === PaymentStatus.CANCELLED) {
      this.logger.warn(`Payment already cancelled: ${id}`);
      throw new HttpException(
        'Payment is already cancelled',
        HttpStatus.BAD_REQUEST,
      );
    }

    // If PayPal payment is in progress, attempt to void/cancel the order
    if (
      payment.payment_method === PaymentMethod.PAYPAL &&
      payment.transactionId &&
      payment.status === PaymentStatus.PENDING
    ) {
      try {
        // Note: PayPal orders are automatically voided after 3 hours if not captured
        // We just log this for tracking purposes
        this.logger.debug(
          `PayPal order ${payment.transactionId} will be auto-voided if not captured`,
        );
        // Optionally, you can implement explicit void via PayPal API here
        // await this.paypalService.voidOrder(payment.transactionId);
      } catch (paypalError: any) {
        this.logger.warn(
          `Failed to void PayPal order: ${paypalError.message}`,
        );
        // Continue with cancellation even if PayPal void fails
      }
    }

    // Update payment status to CANCELLED
    await this.paymentsRepository.update(id, {
      status: PaymentStatus.CANCELLED,
      redirect_url: null, // Clear redirect URL
    });

    // Reset book status to CANCELLED / PENDING
    if (payment.service_type === ServiceType.TOUR && payment.bookTour) {
      await this.bookToursService.updateStatusBookTour(
        payment.bookTour.id,
        StatusBookTour.CANCELLED,
      );
    } else if (payment.service_type === ServiceType.RENT_MOTOR && payment.bookMotor) {
      await this.bookMotorsService.updateStatus(
        payment.bookMotor.id,
        StatusBookMotor.PENDING, // Or keep as PENDING for motor?
      );
    } else if (
      payment.service_type === ServiceType.ENTERTAINMENT &&
      payment.bookEntertainmentAttraction
    ) {
      await this.bookEntertainmentAttractionsService.updateStatus(
        payment.bookEntertainmentAttraction.id,
        StatusBookEntertainmentAttraction.CANCELLED,
      );
    } else if (
      payment.service_type === ServiceType.DOCUMENT_VISA &&
      payment.bookDocumentVisa
    ) {
      await this.bookDocumentVisasService.updateStatus(
        payment.bookDocumentVisa.id,
        {
          status: StatusBookDocumentVisa.CANCELLED,
          log_title: 'Booking Cancelled',
          log_note: 'Pembayaran dibatalkan oleh pengguna.',
        },
      );
    }

    this.logger.debug(
      `Payment cancelled successfully: ${id} by user ${userId}`,
    );

    const customerId =
      payment.customer?.id ||
      payment.bookDocumentVisa?.customer?.id ||
      payment.bookTour?.customer?.id ||
      payment.bookMotor?.customer?.id ||
      payment.bookEntertainmentAttraction?.customer?.id ||
      (payment as any).customer_id ||
      '';

    return {
      message: 'Payment cancelled successfully',
      data: {
        id: payment.id,
        customer_id: customerId,
        invoice_code: payment.invoice_code,
        book_tour_id: payment.bookTour?.id || '',
        book_motor_id: payment.bookMotor?.id || '',
        book_entertainment_attraction_id:
          payment.bookEntertainmentAttraction?.id || '',
        book_document_visa_id: payment.bookDocumentVisa?.id || '',
        amount: payment.amount,
        currency: payment.currency,
        service_type: payment.service_type,
        status: PaymentStatus.CANCELLED,
        payment_method: payment.payment_method,
        transaction_id: payment.transactionId,
        created_at: payment.created_at,
        updated_at: new Date(),
      },
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const payment = await this.paymentsRepository.findOne({ where: { id } });
    if (!payment) {
      throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
    }
    await this.paymentsRepository.remove(payment);
    return {
      message: `Delete payment ${id} successfully`,
    };
  }

  /**
   * Generate HTML for order details email
   * @param bookTourItems - Array of booking items
   * @param currency - Currency code (USD, IDR, etc)
   * @param exchangeRate - Exchange rate for conversion (optional)
   */
  private async generateOrderDetailsHTML(
    items: any[],
    serviceType: ServiceType,
    currency?: string,
    exchangeRate?: number,
    addOns: any[] = [],
  ): Promise<string> {
    if (!items || items.length === 0) {
      return `<p>No ${serviceType === ServiceType.TOUR ? 'tour' : serviceType === ServiceType.DOCUMENT_VISA ? 'visa' : 'booking'} items</p>`;
    }

    const normalizedCurrency = currency?.toUpperCase() || 'IDR';
    const isUSD = normalizedCurrency === 'USD';

    const itemsHTML = await Promise.all(
      items.map(async (item: any, index: number) => {
        if (serviceType === ServiceType.TOUR) {
          const translation =
            item.destination?.translations?.find(
              (t: any) => t.language_code === 'id',
            ) || item.destination?.translations?.[0];

          const name = translation?.name || 'Unknown Destination';
          const priceIDR = item.destination?.price || 0;
          const location = item.destination?.location || 'Unknown Location';
          const visitDate = item.visit_date || 'Not specified';

          let priceDisplay = '';
          if (isUSD) {
            const priceUSD = exchangeRate
              ? priceIDR * exchangeRate
              : await this.convertToUSD(priceIDR, 'IDR');
            priceDisplay = `💰 $ ${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else {
            priceDisplay = `💰 Rp ${priceIDR.toLocaleString('id-ID')}`;
          }

          return `
            <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #f67f00;">
              <p style="margin: 5px 0;"><strong>${index + 1}. ${name}</strong></p>
              <p style="margin: 5px 0; color: #666;">📍 ${location}</p>
              <p style="margin: 5px 0; color: #666;">📅 Visit Date: ${visitDate}</p>
              <p style="margin: 5px 0; color: #f67f00; font-weight: bold;">${priceDisplay}</p>
            </div>
          `;
        } else if (serviceType === ServiceType.DOCUMENT_VISA) {
          const packageName = item.package_name || item.package?.name || 'Visa Application';
          const priceIDR = item.subtotal || item.unit_price || 0;
          const qty = item.qty || 1;

          let priceDisplay = '';
          if (isUSD) {
            const priceUSD = exchangeRate
              ? priceIDR * exchangeRate
              : await this.convertToUSD(priceIDR, 'IDR');
            priceDisplay = `💰 $ ${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else {
            priceDisplay = `💰 Rp ${priceIDR.toLocaleString('id-ID')}`;
          }

          return `
            <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #10b981;">
              <p style="margin: 5px 0;"><strong>${index + 1}. ${packageName}</strong></p>
              <p style="margin: 5px 0; color: #666;">👤 Applicants: ${qty}</p>
              <p style="margin: 5px 0; color: #10b981; font-weight: bold;">${priceDisplay}</p>
            </div>
          `;
        } else if (serviceType === ServiceType.ENTERTAINMENT) {
          const attractionName =
            item.entertainment_attraction?.translations?.[0]?.name ||
            item.attraction_name ||
            'Attraction Ticket';
          const priceIDR = item.subtotal || item.unit_price || 0;
          const qty = item.qty || 1;

          let priceDisplay = '';
          if (isUSD) {
            const priceUSD = exchangeRate
              ? priceIDR * exchangeRate
              : await this.convertToUSD(priceIDR, 'IDR');
            priceDisplay = `💰 $ ${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else {
            priceDisplay = `💰 Rp ${priceIDR.toLocaleString('id-ID')}`;
          }

          return `
            <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #8b5cf6;">
              <p style="margin: 5px 0;"><strong>${index + 1}. ${attractionName}</strong></p>
              <p style="margin: 5px 0; color: #666;">🎟️ Quantity: ${qty}</p>
              <p style="margin: 5px 0; color: #8b5cf6; font-weight: bold;">${priceDisplay}</p>
            </div>
          `;
        } else {
          // MOTOR RENTAL
          const motorName = item.motor_name || item.motor?.translations?.[0]?.name_motor || 'Motor Rental';
          const priceIDR = item.price || 0;
          const quantity = item.qty || item.quantity || 1;

          let priceDisplay = '';
          if (isUSD) {
            const priceUSD = exchangeRate
              ? priceIDR * exchangeRate
              : await this.convertToUSD(priceIDR, 'IDR');
            priceDisplay = `💰 $ ${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else {
            priceDisplay = `💰 Rp ${priceIDR.toLocaleString('id-ID')}`;
          }

          return `
            <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #00a8ff;">
              <p style="margin: 5px 0;"><strong>${index + 1}. ${motorName}</strong></p>
              <p style="margin: 5px 0; color: #666;">🔢 Quantity: ${quantity}</p>
              <p style="margin: 5px 0; color: #00a8ff; font-weight: bold;">${priceDisplay}</p>
            </div>
          `;
        }
      }),
    );

    // Add-ons Section
    let addOnsHTML = '';
    if (addOns && addOns.length > 0) {
      addOnsHTML = `
        <div style="margin-top: 20px; border-top: 1px dashed #ddd; pt: 10px;">
          <h4 style="margin-bottom: 10px; color: #333;">Add-ons:</h4>
          ${await Promise.all(
            addOns.map(async (addOn: any) => {
              const priceIDR = addOn.price || 0;
              let priceDisplay = '';
              if (isUSD) {
                const priceUSD = exchangeRate
                  ? priceIDR * exchangeRate
                  : await this.convertToUSD(priceIDR, 'IDR');
                priceDisplay = `$ ${priceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              } else {
                priceDisplay = `Rp ${priceIDR.toLocaleString('id-ID')}`;
              }
              return `<p style="margin: 3px 0; font-size: 14px;">• ${addOn.name}: <span style="color: #666;">${priceDisplay}</span></p>`;
            }),
          ).then((parts) => parts.join(''))}
        </div>
      `;
    }

    return itemsHTML.join('') + addOnsHTML;
  }
}
