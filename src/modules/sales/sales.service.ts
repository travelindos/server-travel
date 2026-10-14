import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import {
  FilterSaleDto,
  FilterSalesReportDto,
  SalesPeriod,
} from './dto/filter-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  /**
   * GET /sales
   * List all successful sales transactions with pagination and filters
   */
  async findAll(query?: FilterSaleDto): Promise<any> {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query?.limit || 10)));
    const skip = (page - 1) * limit;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.bookTour', 'bookTour')
      .leftJoinAndSelect('payment.bookMotor', 'bookMotor')
      .leftJoinAndSelect(
        'payment.bookEntertainmentAttraction',
        'bookEntertainmentAttraction',
      )
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.status = :status', { status: PaymentStatus.SUCCES });

    if (query?.service_type) {
      qb.andWhere('payment.service_type = :service_type', {
        service_type: query.service_type,
      });
    }

    if (query?.currency) {
      qb.andWhere('payment.currency = :currency', {
        currency: query.currency,
      });
    }

    if (query?.start_date) {
      qb.andWhere('payment.created_at >= :start_date', {
        start_date: new Date(query.start_date),
      });
    }

    if (query?.end_date) {
      qb.andWhere('payment.created_at <= :end_date', {
        end_date: new Date(query.end_date),
      });
    }

    const [payments, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('payment.created_at', 'DESC')
      .getManyAndCount();

    return {
      message: 'Sales retrieved successfully',
      data: payments.map((payment) => ({
        id: payment.id,
        date: payment.created_at,
        invoice_code: payment.invoice_code,
        book_tour_id: payment.bookTour?.id || null,
        book_motor_id: payment.bookMotor?.id || null,
        book_entertainment_attraction_id:
          payment.bookEntertainmentAttraction?.id || null,
        service_type: payment.service_type,
        currency: payment.currency,
        amount: Number(payment.amount),
        status: payment.status,
        payment_method: payment.payment_method,
        payer_email: payment.payer_email,
      })),
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /sales/summary
   * Overall metrics / KPI
   */
  async getSummary(query?: FilterSaleDto): Promise<any> {
    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.SUCCES });

    if (query?.service_type) {
      qb.andWhere('payment.service_type = :service_type', {
        service_type: query.service_type,
      });
    }

    if (query?.start_date) {
      qb.andWhere('payment.created_at >= :start_date', {
        start_date: new Date(query.start_date),
      });
    }

    if (query?.end_date) {
      qb.andWhere('payment.created_at <= :end_date', {
        end_date: new Date(query.end_date),
      });
    }

    const totalRevenueRaw = await qb
      .clone()
      .select('SUM(payment.amount)', 'total')
      .getRawOne();

    const totalOrders = await qb.clone().getCount();
    const totalRevenue = parseFloat(totalRevenueRaw?.total || '0');
    const averageOrderValue =
      totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0;

    return {
      message: 'Sales summary retrieved successfully',
      data: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
      },
    };
  }

  /**
   * GET /sales/reports?period=daily|weekly|monthly|yearly
   * Unified time-series aggregation report
   */
  async getReports(query?: FilterSalesReportDto): Promise<any> {
    const period = query?.period || SalesPeriod.DAILY;

    let dateFormat: string;
    switch (period) {
      case SalesPeriod.WEEKLY:
        dateFormat = '%Y-%u';
        break;
      case SalesPeriod.MONTHLY:
        dateFormat = '%Y-%m';
        break;
      case SalesPeriod.YEARLY:
        dateFormat = '%Y';
        break;
      case SalesPeriod.DAILY:
      default:
        dateFormat = '%Y-%m-%d';
        break;
    }

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .select(`DATE_FORMAT(payment.created_at, '${dateFormat}')`, 'label')
      .addSelect('SUM(payment.amount)', 'total')
      .addSelect('COUNT(payment.id)', 'count')
      .where('payment.status = :status', { status: PaymentStatus.SUCCES });

    if (query?.service_type) {
      qb.andWhere('payment.service_type = :service_type', {
        service_type: query.service_type,
      });
    }

    if (query?.start_date) {
      qb.andWhere('payment.created_at >= :start_date', {
        start_date: new Date(query.start_date),
      });
    }

    if (query?.end_date) {
      qb.andWhere('payment.created_at <= :end_date', {
        end_date: new Date(query.end_date),
      });
    }

    const result = await qb
      .groupBy('label')
      .orderBy('label', 'ASC')
      .getRawMany();

    return {
      message: `Sales ${period} report retrieved successfully`,
      data: result.map((r) => ({
        label: String(r.label),
        total: parseFloat(r.total || '0'),
        count: parseInt(r.count || '0', 10),
      })),
    };
  }

  /**
   * GET /sales/:id
   * Detail single sale record
   */
  async findOne(id: string): Promise<any> {
    const payment = await this.paymentsRepository.findOne({
      where: { id, status: PaymentStatus.SUCCES },
      relations: [
        'bookTour',
        'bookTour.customer',
        'bookTour.booker',
        'bookMotor',
        'bookMotor.user',
        'bookEntertainmentAttraction',
        'bookEntertainmentAttraction.customer',
        'bookEntertainmentAttraction.pemesan',
        'user',
      ],
    });

    if (!payment) {
      throw new NotFoundException(`Sale record with ID ${id} not found`);
    }

    return {
      message: `Sale record with ID ${id} retrieved successfully`,
      data: {
        id: payment.id,
        date: payment.created_at,
        invoice_code: payment.invoice_code,
        book_tour_id: payment.bookTour?.id || null,
        book_motor_id: payment.bookMotor?.id || null,
        book_entertainment_attraction_id:
          payment.bookEntertainmentAttraction?.id || null,
        service_type: payment.service_type,
        currency: payment.currency,
        amount: Number(payment.amount),
        status: payment.status,
        payment_method: payment.payment_method,
        payer_email: payment.payer_email,
        user: payment.user
          ? {
              id: payment.user.id,
              name: payment.user.name,
              email: payment.user.email,
            }
          : null,
        book_tour: payment.bookTour || null,
        book_motor: payment.bookMotor || null,
        book_entertainment_attraction:
          payment.bookEntertainmentAttraction || null,
      },
    };
  }
}
