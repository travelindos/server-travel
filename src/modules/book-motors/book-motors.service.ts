import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource, In, Repository } from 'typeorm';
import { Logger } from 'winston';
import { MotorPrice, PriceType } from '../motors/entities/motor-price.entity';
import { Motor } from '../motors/entities/motor.entity';
import { Tourist } from '../tourists/entities/tourist.entity';
import { User } from '../users/entities/user.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Booker } from '../bookers/entities/booker.entity';
import { CreateBookMotorDto } from './dto/create-book-motor.dto';
import { UpdateBookMotorDto } from './dto/update-book-motor.dto';
import { FilterBookMotorDto } from './dto/filter-book-motor.dto';
import { BookMotorItem } from './entities/book-motor-item.entity';
import { BookMotor, StatusBookMotor } from './entities/book-motor.entity';
import { BookMotorResponse, BookMotorData } from '../../types/response/book-motor.type';
import { AddOn } from '../add-ons/entities/add-on.entity';
import { BookingAddOn } from '../add-ons/entities/booking-add-on.entity';

@Injectable()
export class BookMotorsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(BookMotor)
    private readonly bookMotorRepository: Repository<BookMotor>,
    @InjectRepository(BookMotorItem)
    private readonly bookMotorItemRepository: Repository<BookMotorItem>,
    @InjectRepository(Motor)
    private readonly motorRepository: Repository<Motor>,
    @InjectRepository(Tourist)
    private readonly touristRepository: Repository<Tourist>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Booker)
    private readonly bookerRepository: Repository<Booker>,
    @InjectRepository(AddOn)
    private readonly addOnRepository: Repository<AddOn>,
    @InjectRepository(BookingAddOn)
    private readonly bookingAddOnRepository: Repository<BookingAddOn>,
    private readonly dataSource: DataSource,
  ) {}

  private parseCustomDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    // Match DD-MM-YYYY (e.g. 16-11-2026)
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    }
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      throw new HttpException(
        `Invalid date format: ${dateStr}. Please use DD-MM-YYYY format (e.g. 16-11-2026)`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return parsed;
  }

  private calculateRentalDays(start: Date, end: Date): number {
    const diffInMs = end.getTime() - start.getTime();
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  }

  private calculatePrice(days: number, prices: MotorPrice[]): number {
    const dailyPrice =
      prices?.find((p) => p.price_type === PriceType.DAILY)?.price || 0;
    const weeklyPrice =
      prices?.find((p) => p.price_type === PriceType.WEEKLY)?.price || 0;

    if (days >= 7 && weeklyPrice > 0) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      return (
        Number(weeks) * Number(weeklyPrice) +
        Number(remainingDays) * Number(dailyPrice)
      );
    }

    return Number(days) * Number(dailyPrice);
  }

  private mapToResponseData(booking: BookMotor): BookMotorData {
    return {
      id: booking.id,
      customer_id: booking.customer?.id,
      booker_id: booking.booker?.id,
      booker: booking.booker
        ? {
            id: booking.booker.id,
            name: booking.booker.name,
            email: booking.booker.email,
            phone_number: booking.booker.phone_number,
          }
        : null,
      user_id: booking.user?.id,
      start_date: booking.start_date,
      end_date: booking.end_date,
      expired_at: booking.expired_at,
      total_price: Number(booking.total_price),
      status: booking.status,
      notes: booking.notes || null,
      note: booking.notes || null,
      book_motor_items:
        booking.book_motor_items?.map((item) => ({
          id: item.id,
          motor_id: item.motor?.id || (item as any).motor_id,
          price: Number(item.price),
          qty: item.qty,
          subtotal: Number(item.subtotal),
        })) || [],
      tourists:
        booking.tourists?.map((t) => ({
          id: t.id,
          name: t.name,
          passport_number: t.passport_number,
          phone_number: t.phone_number,
        })) || [],
      booking_add_ons:
        booking.booking_add_ons?.map((ba) => ({
          id: ba.id,
          add_on_id: ba.add_on?.id,
          name: ba.add_on?.name,
          price: Number(ba.price_at_booking),
        })) || [],
      created_at: booking.created_at,
      updated_at: booking.updated_at,
    };
  }

  // ─── Automatic Auto-Expiration Cleanup Sweep (Hold Time Expiry) ──────────────
  private async sweepExpiredBookings(): Promise<void> {
    try {
      const now = new Date();
      await this.bookMotorRepository
        .createQueryBuilder()
        .update(BookMotor)
        .set({ status: StatusBookMotor.EXPIRED })
        .where('status = :pendingStatus AND expired_at <= :now', {
          pendingStatus: StatusBookMotor.PENDING,
          now,
        })
        .execute();
    } catch (err: any) {
      this.logger.error('Error sweeping expired bookings', err);
    }
  }

  // ─── Create Motor Booking (Date Overlap Check & Hold Time) ─────────────────
  async create(
    createBookMotorDto: CreateBookMotorDto,
    user?: User,
    customerId?: string,
  ): Promise<BookMotorResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Clean up any stale expired bookings
      await this.sweepExpiredBookings();

      const { items, tourists, start_date, end_date, add_ons, customer_id, booker_id } =
        createBookMotorDto;
      const startDate = this.parseCustomDate(start_date);
      const endDate = this.parseCustomDate(end_date);
      const days = this.calculateRentalDays(startDate, endDate);

      if (days <= 0) {
        throw new HttpException('Invalid rental duration', HttpStatus.BAD_REQUEST);
      }

      if (!items || items.length === 0) {
        throw new HttpException('Motor items are required', HttpStatus.BAD_REQUEST);
      }

      const motorIds = items.map((i) => i.motor_id);

      // 2. High-Concurrency Overlap Conflict Check (Zero N+1 Query)
      const now = new Date();
      const overlappingItem = await queryRunner.manager
        .createQueryBuilder(BookMotorItem, 'item')
        .innerJoin('item.book_motor', 'bm')
        .innerJoin('item.motor', 'm')
        .leftJoinAndSelect('m.translations', 'trans')
        .where('m.id IN (:...motorIds)', { motorIds })
        .andWhere('bm.status IN (:...activeStatuses)', {
          activeStatuses: [
            StatusBookMotor.PENDING,
            StatusBookMotor.CONFIRMED,
            StatusBookMotor.ONGOING,
          ],
        })
        .andWhere('(bm.expired_at IS NULL OR bm.expired_at > :now)', { now })
        .andWhere('bm.start_date < :endDate AND bm.end_date > :startDate', {
          startDate,
          endDate,
        })
        .getOne();

      if (overlappingItem) {
        const motorName =
          overlappingItem.motor?.translations?.[0]?.name_motor || overlappingItem.motor?.id;
        throw new ConflictException(
          `Motor ${motorName} is already reserved or booked for the selected dates.`,
        );
      }

      // 3. Batch Fetch Motors & Prices (Zero N+1 Query)
      const motors = await queryRunner.manager.find(Motor, {
        where: { id: In(motorIds) },
        relations: ['motor_prices', 'translations'],
      });

      const motorMap = new Map(motors.map((m) => [m.id, m]));
      for (const id of motorIds) {
        if (!motorMap.has(id)) {
          throw new NotFoundException(`Motor with ID ${id} not found`);
        }
      }

      // Resolve Customer and Booker
      let customer: Customer | null = null;
      const customerIdToFind = customerId || customer_id || (user as any)?.id;
      if (customerIdToFind) {
        customer = await this.customerRepository.findOne({
          where: { id: customerIdToFind },
        });
      }

      let booker: Booker | null = null;
      if (booker_id) {
        booker = await this.bookerRepository.findOne({
          where: { id: booker_id },
        });
      }

      // 4. Set 15-Minute Temporary Reservation Hold Time (expired_at)
      const HOLD_TIME_MINUTES = 15;
      const expiredAt = new Date(Date.now() + HOLD_TIME_MINUTES * 60 * 1000);

      // Create Booking Header
      const bookMotor = this.bookMotorRepository.create({
        customer: customer || undefined,
        booker: booker || undefined,
        user: user || undefined,
        start_date: startDate,
        end_date: endDate,
        expired_at: expiredAt,
        notes: createBookMotorDto.notes || createBookMotorDto.note || undefined,
        status: StatusBookMotor.PENDING,
        total_price: 0,
      });

      const savedHeader = await queryRunner.manager.save(bookMotor);
      let grandTotal = 0;

      // 5. Batch Insert Motor Items
      const bookItemsToSave = items.map((itemDto) => {
        const motor = motorMap.get(itemDto.motor_id)!;
        const unitPrice = this.calculatePrice(days, motor.motor_prices);
        const subtotal = unitPrice * itemDto.qty;
        grandTotal += subtotal;

        return this.bookMotorItemRepository.create({
          book_motor: savedHeader,
          motor: motor,
          price: unitPrice,
          qty: itemDto.qty,
          subtotal: subtotal,
        });
      });

      await queryRunner.manager.save(bookItemsToSave);

      // 6. Batch Insert Tourists (Drivers/Riders)
      if (tourists && tourists.length > 0) {
        const touristsToSave = tourists.map((t) =>
          this.touristRepository.create({
            book_motor: savedHeader,
            name: t.name,
            passport_number: t.passport_number,
            phone_number: t.phone_number,
            gender: t.gender,
            nationality: t.nationality,
          }),
        );
        await queryRunner.manager.save(touristsToSave);
      }

      // 7. Batch Insert Add-Ons (if any)
      if (add_ons && add_ons.length > 0) {
        const fetchedAddOns = await queryRunner.manager.find(AddOn, {
          where: { id: In(add_ons) },
        });

        const bookingAddOnsToSave = fetchedAddOns.map((addon) => {
          grandTotal += Number(addon.price);
          return this.bookingAddOnRepository.create({
            book_motor: savedHeader,
            add_on: addon,
            price_at_booking: addon.price,
          });
        });
        await queryRunner.manager.save(bookingAddOnsToSave);
      }

      // 8. Update Final Total Price
      savedHeader.total_price = grandTotal;
      await queryRunner.manager.save(savedHeader);

      await queryRunner.commitTransaction();

      this.logger.debug(
        `Motor Booking created successfully with ID: ${savedHeader.id}, Total: ${grandTotal}, Hold until: ${expiredAt}`,
      );

      const completeBooking = await this.findOneRaw(savedHeader.id);

      return {
        message: `Booking motor with ID ${savedHeader.id} created successfully`,
        data: this.mapToResponseData(completeBooking),
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error create motor booking', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async findOneRaw(id: string): Promise<BookMotor> {
    const booking = await this.bookMotorRepository.findOne({
      where: { id },
      relations: [
        'book_motor_items',
        'book_motor_items.motor',
        'book_motor_items.motor.translations',
        'tourists',
        'booking_add_ons',
        'booking_add_ons.add_on',
        'customer',
        'booker',
        'user',
      ],
    });
    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }

  // ─── Find All Motor Bookings (QueryBuilder + Sweep + Pagination) ─────────────
  async findAll(
    query?: FilterBookMotorDto,
    customerId?: string,
  ): Promise<BookMotorResponse & { meta?: any }> {
    await this.sweepExpiredBookings();

    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query?.limit || 10)));
    const skip = (page - 1) * limit;

    const qb = this.bookMotorRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.book_motor_items', 'book_motor_items')
      .leftJoinAndSelect('book_motor_items.motor', 'motor')
      .leftJoinAndSelect('motor.translations', 'translations')
      .leftJoinAndSelect('booking.tourists', 'tourists')
      .leftJoinAndSelect('booking.booking_add_ons', 'booking_add_ons')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.booker', 'booker')
      .leftJoinAndSelect('booking.user', 'user');

    if (customerId) {
      qb.andWhere('booking.customer_id = :customerId', { customerId });
    }

    if (query?.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    if (query?.notes || query?.note) {
      const notesVal = query.notes || query.note;
      qb.andWhere('booking.notes LIKE :notes', { notes: `%${notesVal}%` });
    }

    if (query?.search) {
      qb.andWhere(
        '(booking.id LIKE :search OR booking.notes LIKE :search OR translations.name_motor LIKE :search OR tourists.name LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [bookings, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('booking.created_at', 'DESC')
      .getManyAndCount();

    this.logger.debug(`Success find all motor bookings (page: ${page}, limit: ${limit}, total: ${total})`);

    return {
      message: 'Motor bookings retrieved successfully',
      data: bookings.map((b) => this.mapToResponseData(b)) as any,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  // ─── Find One Motor Booking ──────────────────────────────────────────────────
  async findOne(id: string, customerId?: string): Promise<BookMotorResponse> {
    await this.sweepExpiredBookings();
    const booking = await this.findOneRaw(id);

    if (customerId && booking.customer?.id && booking.customer.id !== customerId) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return {
      message: `Booking with ID ${id} found successfully`,
      data: this.mapToResponseData(booking),
    };
  }

  // ─── Update Booking Status (Optimistic Locking) ─────────────────────────────
  async updateStatus(id: string, status: StatusBookMotor): Promise<BookMotorResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(BookMotor, {
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      // Update status
      booking.status = status;
      if (status === StatusBookMotor.CONFIRMED || status === StatusBookMotor.CANCELLED) {
        booking.expired_at = undefined as any;
      }

      await queryRunner.manager.save(booking);

      await queryRunner.commitTransaction();
      this.logger.debug(`Booking ${id} status updated to ${status}`);

      const updatedBooking = await this.findOneRaw(id);

      return {
        message: `Booking with ID ${id} status updated to ${status} successfully`,
        data: this.mapToResponseData(updatedBooking),
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error update booking status', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Update Motor Booking (Tourists, Booker, Add-ons, Dates) ────────────────
  async update(
    id: string,
    updateDto: UpdateBookMotorDto,
    user?: User,
    customerId?: string,
  ): Promise<BookMotorResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await queryRunner.manager.findOne(BookMotor, {
        where: { id },
        relations: [
          'customer',
          'booker',
          'book_motor_items',
          'book_motor_items.motor',
          'book_motor_items.motor.motor_prices',
        ],
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      if (booking.status === StatusBookMotor.EXPIRED) {
        throw new BadRequestException(
          'Booking ini telah kedaluwarsa. Silakan pilih motor kembali untuk membuat pesanan baru.',
        );
      }

      if (customerId && booking.customer && booking.customer.id !== customerId) {
        throw new ForbiddenException('You are not authorized to update this booking');
      }

      // 1. Update booker if provided
      if (updateDto.booker_id) {
        const booker = await this.bookerRepository.findOne({
          where: { id: updateDto.booker_id },
        });
        if (booker) {
          booking.booker = booker;
        }
      }

      // Update notes if provided
      if ((updateDto as any).notes !== undefined || (updateDto as any).note !== undefined) {
        booking.notes = (updateDto as any).notes || (updateDto as any).note || undefined;
      }

      // 2. Update dates if provided
      let days = this.calculateRentalDays(booking.start_date, booking.end_date);
      if (updateDto.start_date || updateDto.end_date) {
        const startDate = updateDto.start_date
          ? this.parseCustomDate(updateDto.start_date)
          : booking.start_date;
        const endDate = updateDto.end_date
          ? this.parseCustomDate(updateDto.end_date)
          : booking.end_date;
        days = this.calculateRentalDays(startDate, endDate);
        if (days <= 0) {
          throw new HttpException('Invalid rental duration', HttpStatus.BAD_REQUEST);
        }
        booking.start_date = startDate;
        booking.end_date = endDate;

        // Recalculate motor item prices for new duration
        for (const item of booking.book_motor_items || []) {
          const unitPrice = this.calculatePrice(days, item.motor.motor_prices);
          item.price = unitPrice;
          item.subtotal = unitPrice * item.qty;
          await queryRunner.manager.save(item);
        }
      }

      // 3. Update Tourists if provided
      if (updateDto.tourists) {
        await queryRunner.manager.delete(Tourist, { book_motor: { id } });
        const touristEntities = updateDto.tourists.map((t) =>
          this.touristRepository.create({
            ...t,
            book_motor: { id } as any,
          }),
        );
        await queryRunner.manager.save(touristEntities);
      }

      // 4. Update Add-ons if provided
      if (updateDto.add_ons) {
        await queryRunner.manager.delete(BookingAddOn, { book_motor: { id } });
        if (updateDto.add_ons.length > 0) {
          const fetchedAddOns = await queryRunner.manager.find(AddOn, {
            where: { id: In(updateDto.add_ons) },
          });
          const addOnEntities = fetchedAddOns.map((addon) =>
            this.bookingAddOnRepository.create({
              book_motor: booking,
              add_on: addon,
              price_at_booking: addon.price,
            }),
          );
          await queryRunner.manager.save(addOnEntities);
        }
      }

      // 5. Recalculate total
      const motorSubtotal = (booking.book_motor_items || []).reduce(
        (sum, item) => sum + Number(item.subtotal || 0),
        0,
      );
      const currentAddOns = await queryRunner.manager.find(BookingAddOn, {
        where: { book_motor: { id } },
      });
      const addOnSubtotal = currentAddOns.reduce(
        (sum, ao) => sum + Number(ao.price_at_booking || 0),
        0,
      );
      const grandTotal = motorSubtotal + addOnSubtotal;

      booking.total_price = grandTotal;
      if (booking.status === StatusBookMotor.DRAFT) {
        booking.status = StatusBookMotor.PENDING;
        booking.expired_at = new Date(Date.now() + 15 * 60 * 1000);
      }
      await queryRunner.manager.save(booking);

      await queryRunner.commitTransaction();

      const completeBooking = await this.findOneRaw(booking.id);
      return {
        message: `Booking with ID ${id} updated successfully`,
        data: this.mapToResponseData(completeBooking),
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error update motor booking', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Delete Motor Booking (Soft Delete) ──────────────────────────────────────
  async remove(id: string): Promise<BookMotorResponse> {
    const booking = await this.bookMotorRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    await this.bookMotorRepository.softRemove(booking);
    return {
      message: `Booking with ID ${id} deleted successfully`,
    };
  }
}
