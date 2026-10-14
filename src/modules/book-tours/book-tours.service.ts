import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TourResponse } from '../../types/response/book-tour.type';
import { AddOn } from '../add-ons/entities/add-on.entity';
import { BookingAddOn } from '../add-ons/entities/booking-add-on.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Itinerary, StatusItinerary } from '../itinerary/entities/itinerary.entity';
import { Tourist } from '../tourists/entities/tourist.entity';
import { BookersService } from '../bookers/bookers.service';
import { CreateBookTourDto } from './dto/create-book-tour.dto';
import { FilterBookTourDto } from './dto/filter-book-tour.dto';
import { BookTour, StatusBookTour } from './entities/book-tour.entity';

const BOOK_TOUR_RELATIONS = [
  'customer',
  'booker',
  'itinerary',
  'itinerary.itinerary_items',
  'itinerary.itinerary_items.destination',
  'itinerary.itinerary_items.destination.translations',
  'itinerary.country',
  'itinerary.state',
  'tourists',
  'add_ons',
  'add_ons.add_on',
  'payments',
];

@Injectable()
export class BookToursService {
  constructor(
    @InjectRepository(BookTour)
    private readonly bookTourRepository: Repository<BookTour>,
    @InjectRepository(Itinerary)
    private readonly itineraryRepository: Repository<Itinerary>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Tourist)
    private readonly touristRepository: Repository<Tourist>,
    @InjectRepository(AddOn)
    private readonly addOnRepository: Repository<AddOn>,
    @InjectRepository(BookingAddOn)
    private readonly bookingAddOnRepository: Repository<BookingAddOn>,
    private readonly bookersService: BookersService,
  ) {}

  // ─── Generate Sequential Code TOUR-01{sequence}-{dd}-{mm}-{yy} ─────────────
  private async generateBookingCode(): Promise<string> {
    const count = await this.bookTourRepository.count();
    const sequence = String(count + 1).padStart(3, '0');

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);

    return `TOUR-${sequence}-${dd}-${mm}-${yy}`;
  }

  // ─── Create Book Tour ──────────────────────────────────────────────────────
  async create(
    customerId: string,
    dto: CreateBookTourDto,
  ): Promise<TourResponse> {
    const itinerary = await this.itineraryRepository.findOne({
      where: {
        id: dto.itinerary_id,
        customer: { id: customerId },
      },
      relations: ['itinerary_items', 'itinerary_items.destination'],
    });

    if (!itinerary) {
      throw new HttpException(
        'Itinerary not found or does not belong to customer',
        HttpStatus.NOT_FOUND,
      );
    }

    const bookerId = dto.booker_id;
    const bookerName = dto.booker_name;
    const bookerEmail = dto.booker_email;
    const bookerPhone = dto.booker_phone;
    const touristsList = dto.tourists || [];

    if (!bookerId && (!bookerName || !bookerEmail || !bookerPhone)) {
      throw new HttpException(
        'Data pemesan wajib diisi: Sertakan booker_id ATAU (booker_name, booker_email, booker_phone)',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!touristsList || touristsList.length === 0) {
      throw new HttpException(
        'Tourists list is required and cannot be empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Find or create Booker profile for customer
    const booker = await this.bookersService.findOrCreateBooker(customerId, {
      booker_id: bookerId,
      booker_name: bookerName,
      booker_email: bookerEmail,
      booker_phone: bookerPhone,
    });

    const touristCount = touristsList.length;
    const itineraryPrice = Number(itinerary.subtotal || 0);
    let subtotal = itineraryPrice * touristCount;
    const code = await this.generateBookingCode();

    // Initial BookTour creation
    const bookTour = this.bookTourRepository.create({
      code,
      itinerary: { id: itinerary.id },
      customer: { id: customerId },
      booker: { id: booker.id },
      notes: dto.notes || dto.note || undefined,
      subtotal: subtotal,
      tax: 0,
      total: subtotal,
      status: StatusBookTour.PENDING,
    });

    await this.bookTourRepository.save(bookTour);

    // Batch Add-Ons lookup and bulk insert
    let addOnsPrice = 0;
    if (dto.add_ons && dto.add_ons.length > 0) {
      const addOns = await this.addOnRepository.find({
        where: { id: In(dto.add_ons) },
      });

      if (addOns.length > 0) {
        const bookingAddOnsToSave = addOns.map((addOn) => {
          addOnsPrice += Number(addOn.price || 0);
          return this.bookingAddOnRepository.create({
            book_tour: { id: bookTour.id },
            add_on: { id: addOn.id },
            price_at_booking: Number(addOn.price || 0),
          });
        });

        await this.bookingAddOnRepository.save(bookingAddOnsToSave);
      }
    }

    // Calculate Tax & Final Totals
    subtotal = subtotal + addOnsPrice;
    const systemTaxPercentage = Number(process.env.TAX_PERCENTAGE || 0);
    const tax = subtotal * (systemTaxPercentage / 100);
    const total = subtotal + tax;

    bookTour.subtotal = subtotal;
    bookTour.tax = tax;
    bookTour.total = total;

    // Batch update bookTour status and itinerary status in parallel
    itinerary.status = StatusItinerary.PENDING;

    await Promise.all([
      this.bookTourRepository.save(bookTour),
      this.itineraryRepository.save(itinerary),
    ]);

    // Batch Tourists Insert
    const touristsEntities = touristsList.map((t) =>
      this.touristRepository.create({
        bookTour: { id: bookTour.id },
        name: t.name,
        gender: t.gender,
        phone_number: t.phone_number,
        nationality: t.nationality,
        passport_number: t.passport_number,
      }),
    );
    await this.touristRepository.save(touristsEntities);

    const detail = await this.findBookTourId(bookTour.id, customerId);
    return {
      message: 'Book tour created successfully',
      data: detail.data,
    };
  }

  // ─── Find All Customer Book Tours (QueryBuilder + Pagination) ─────────────
  async findAll(
    customerId: string,
    query?: FilterBookTourDto,
  ): Promise<TourResponse & { meta?: any }> {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query?.limit || 10)));
    const skip = (page - 1) * limit;

    const qb = this.bookTourRepository
      .createQueryBuilder('bookTour')
      .leftJoinAndSelect('bookTour.customer', 'customer')
      .leftJoinAndSelect('bookTour.booker', 'booker')
      .leftJoinAndSelect('bookTour.itinerary', 'itinerary')
      .leftJoinAndSelect('itinerary.itinerary_items', 'itinerary_items')
      .leftJoinAndSelect('itinerary_items.destination', 'destination')
      .leftJoinAndSelect('destination.translations', 'translations')
      .leftJoinAndSelect('itinerary.country', 'country')
      .leftJoinAndSelect('itinerary.state', 'state')
      .leftJoinAndSelect('bookTour.tourists', 'tourists')
      .leftJoinAndSelect('bookTour.add_ons', 'add_ons')
      .leftJoinAndSelect('add_ons.add_on', 'add_on')
      .leftJoinAndSelect('bookTour.payments', 'payments')
      .where('customer.id = :customerId', { customerId });

    if (query?.status) {
      qb.andWhere('bookTour.status = :status', { status: query.status });
    }

    if (query?.notes || query?.note) {
      const notesVal = query.notes || query.note;
      qb.andWhere('bookTour.notes LIKE :notes', { notes: `%${notesVal}%` });
    }

    if (query?.search) {
      qb.andWhere(
        '(bookTour.code LIKE :search OR bookTour.notes LIKE :search OR tourists.name LIKE :search OR booker.name LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [bookTours, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('bookTour.created_at', 'DESC')
      .getManyAndCount();

    return {
      message: 'Customer book tours retrieved successfully',
      datas: bookTours.map((bt) => this.mapToBookTourResponse(bt)),
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  // ─── Find Book Tour by ID ──────────────────────────────────────────────────
  async findBookTourId(id: string, customerId: string): Promise<TourResponse> {
    const bookTour = await this.bookTourRepository.findOne({
      where: { id, customer: { id: customerId } },
      relations: BOOK_TOUR_RELATIONS,
    });

    if (!bookTour) {
      throw new NotFoundException(`Book tour with ID ${id} not found`);
    }

    return {
      message: `Book tour with ID ${id} found successfully`,
      data: this.mapToBookTourResponse(bookTour),
    };
  }

  // ─── Update Status Book Tour ───────────────────────────────────────────────
  async updateStatusBookTour(
    id: string,
    status: StatusBookTour,
  ): Promise<TourResponse> {
    const bookTour = await this.bookTourRepository.findOne({
      where: { id },
      relations: BOOK_TOUR_RELATIONS,
    });

    if (!bookTour) {
      throw new NotFoundException(`Book tour with ID ${id} not found`);
    }

    await this.bookTourRepository.update(id, { status });

    if (bookTour.itinerary) {
      const statusMap: Record<StatusBookTour, StatusItinerary> = {
        [StatusBookTour.PENDING]: StatusItinerary.PENDING,
        [StatusBookTour.CONFIRMED]: StatusItinerary.CONFIRMED,
        [StatusBookTour.ONGOING]: StatusItinerary.ONGOING,
        [StatusBookTour.COMPLETED]: StatusItinerary.COMPLETED,
        [StatusBookTour.CANCELLED]: StatusItinerary.CANCELLED,
      };

      const itineraryStatus = statusMap[status];
      if (itineraryStatus) {
        await this.itineraryRepository.update(bookTour.itinerary.id, {
          status: itineraryStatus,
        });
      }
    }

    bookTour.status = status;

    return {
      message: `Book tour with ID ${id} status updated to ${status} successfully`,
      data: this.mapToBookTourResponse(bookTour),
    };
  }

  // ─── Delete Book Tour (Soft Remove) ────────────────────────────────────────
  async remove(id: string, customerId?: string): Promise<TourResponse> {
    const where: any = { id };
    if (customerId) {
      where.customer = { id: customerId };
    }

    const bookTour = await this.bookTourRepository.findOne({ where });
    if (!bookTour) {
      throw new NotFoundException(`Book tour with ID ${id} not found`);
    }

    await this.bookTourRepository.softRemove(bookTour);

    return {
      message: `Book tour with ID ${id} deleted successfully`,
    };
  }

  // ─── Helper Mapper ─────────────────────────────────────────────────────────
  private mapToBookTourResponse(bookTour: BookTour) {
    return {
      id: bookTour.id,
      code: bookTour.code,
      itinerary_id: bookTour.itinerary?.id || '',
      customer_id: bookTour.customer?.id || '',
      booker_id: bookTour.booker?.id || '',
      booker: bookTour.booker
        ? {
            id: bookTour.booker.id,
            name: bookTour.booker.name,
            email: bookTour.booker.email,
            phone_number: bookTour.booker.phone_number,
          }
        : undefined,
      subtotal: Number(bookTour.subtotal),
      tax: Number(bookTour.tax),
      total: Number(bookTour.total),
      status: bookTour.status,
      notes: bookTour.notes || null,
      note: bookTour.notes || null,
      created_at: bookTour.created_at,
      updated_at: bookTour.updated_at,
      itinerary: bookTour.itinerary as any,
      tourists: (bookTour.tourists || []).map((t) => ({
        id: t.id,
        name: t.name,
        gender: t.gender,
        phone_number: t.phone_number,
        nationality: t.nationality,
        passport_number: t.passport_number,
      })),
      booking_add_ons: (bookTour.add_ons || []).map((ba) => ({
        id: ba.id,
        add_on_id: ba.add_on?.id,
        name: ba.add_on?.name,
        price: Number(ba.price_at_booking),
      })),
    };
  }
}
