import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Booker } from '../bookers/entities/booker.entity';
import { User } from '../users/entities/user.entity';
import { Tourist } from '../tourists/entities/tourist.entity';
import {
  CreateBookEntertainmentAttractionDto,
  SubmitTouristsDto,
  TouristDto,
  UpdateBookEntertainmentAttractionDto,
} from './dto/create-book-entertainment-attraction.dto';
import { FilterBookEntertainmentAttractionDto } from './dto/filter-book-entertainment-attraction.dto';
import {
  BookEntertainmentAttraction,
  StatusBookEntertainmentAttraction,
} from './entities/book-entertainment-attraction.entity';
import { BookEntertainmentAttractionItem } from './entities/book-entertainment-attraction-item.entity';
import { EntertainmentAttraction } from '../entertainment-attractions/entities/entertainment-attraction.entity';
import { EntertainmentAttractionTicket } from '../entertainment-attractions/entities/entertainment-attraction-ticket.entity';
import {
  BookEntertainmentAttractionResponse,
  BookEntertainmentAttractionData,
} from '../../types/response/book-entertainment-attraction.type';

@Injectable()
export class BookEntertainmentAttractionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BookEntertainmentAttraction)
    private readonly bookingRepository: Repository<BookEntertainmentAttraction>,
    @InjectRepository(BookEntertainmentAttractionItem)
    private readonly bookingItemRepository: Repository<BookEntertainmentAttractionItem>,
    @InjectRepository(EntertainmentAttraction)
    private readonly attractionRepository: Repository<EntertainmentAttraction>,
    @InjectRepository(EntertainmentAttractionTicket)
    private readonly ticketRepository: Repository<EntertainmentAttractionTicket>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Booker)
    private readonly bookerRepository: Repository<Booker>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tourist)
    private readonly touristRepository: Repository<Tourist>,
  ) {}

  // ─── Age Calculation Helper ──────────────────────────────────────────────────
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private parseBirthDate(raw: string): Date {
    // Expects format DD-MM-YYYY
    const [day, month, year] = raw.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  // ─── Map Helper ──────────────────────────────────────────────────────────────
  private mapToResponseData(
    booking: BookEntertainmentAttraction,
  ): BookEntertainmentAttractionData {
    return {
      id: booking.id,
      customer_id: booking.customer?.id,
      booker_id: booking.booker?.id,
      pemesan_id: booking.booker?.id,
      booker: booking.booker
        ? {
            id: booking.booker.id,
            name: booking.booker.name,
            email: booking.booker.email,
            phone_number: booking.booker.phone_number,
          }
        : null,
      user_id: booking.user?.id,
      status: booking.status,
      subtotal: Number(booking.subtotal),
      booking_date: booking.booking_date,
      expired_at: booking.expired_at,
      notes: booking.notes || null,
      note: booking.notes || null,
      book_entertainment_attraction_items:
        booking.book_entertainment_attraction_items?.map((item) => ({
          id: item.id,
          entertainment_attraction_id: item.entertainment_attraction?.id,
          entertainment_attraction_name:
            item.entertainment_attraction?.translations?.[0]?.name || undefined,
          ticket_id: item.ticket?.id,
          ticket_name: item.ticket_name || item.ticket?.name,
          unit_price: Number(item.unit_price),
          qty: item.qty,
          subtotal: Number(item.subtotal),
        })) || [],
      tourists:
        booking.tourists?.map((t) => ({
          id: t.id,
          name: t.name,
          gender: t.gender,
          passport_number: t.passport_number,
          phone_number: t.phone_number,
          nationality: t.nationality,
          birth_date: t.birth_date,
          age_group: t.age_group,
        })) || [],
      created_at: booking.created_at,
      updated_at: booking.updated_at,
    };
  }

  // ─── Create Draft Booking (Optimized: Zero N+1 + Quota Schedule + Transaction) ───
  async create(
    dto: CreateBookEntertainmentAttractionDto,
    customerId?: string,
    userParam?: User,
  ): Promise<BookEntertainmentAttractionResponse> {
    // 1. Resolve Customer, Booker, and User
      let customer: Customer | null = null;
      const targetCustomerId = customerId || dto.customer_id;
      if (targetCustomerId) {
        customer = await this.customerRepository.findOne({
          where: { id: targetCustomerId },
        });
      }

      let booker: Booker | null = null;
      const targetBookerId = dto.booker_id || dto.pemesan_id;
      if (targetBookerId) {
        booker = await this.bookerRepository.findOne({
          where: { id: targetBookerId },
        });
      }

      let user: User | null = userParam || null;
      if (!user && dto.user_id) {
        user = await this.userRepository.findOne({ where: { id: dto.user_id } });
      }

      // 3. Resolve Schedule / Booking Date
      let parsedBookingDate: Date;
      if (dto.booking_date) {
        parsedBookingDate = this.parseBirthDate(dto.booking_date);
      } else {
        const now = new Date();
        parsedBookingDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      }

      // 4. Batch Fetch Tickets & Attractions (ELIMINATES N+1 QUERY)
      const ticketIds = (dto.items || []).map((i) => i.ticket_id).filter((id): id is string => !!id);
      let tickets: EntertainmentAttractionTicket[] = [];
      if (ticketIds.length > 0) {
        tickets = await this.ticketRepository.find({
          where: { id: In(ticketIds) },
          relations: ['attraction', 'attraction.translations'],
        });
      }
      const ticketMap = new Map(tickets.map((t) => [t.id, t]));

      const attractionIds = (dto.items || [])
        .map((i) => i.entertainment_attraction_id)
        .filter((id): id is string => !!id);
      let attractions: EntertainmentAttraction[] = [];
      if (attractionIds.length > 0) {
        attractions = await this.attractionRepository.find({
          where: { id: In(attractionIds) },
          relations: ['translations'],
        });
      }
      const attractionMap = new Map(attractions.map((a) => [a.id, a]));

      // 5. Build Items & Validate Daily Quotas per Schedule Date
      let calculatedSubtotal = 0;
      const itemsToCreate: Partial<BookEntertainmentAttractionItem>[] = [];

      if (dto.items && dto.items.length > 0) {
        for (const itemDto of dto.items) {
          const ticket = itemDto.ticket_id ? ticketMap.get(itemDto.ticket_id) || null : null;
          let attraction = ticket ? ticket.attraction : null;
          let unitPrice = Number(itemDto.unit_price || 0);
          let ticketName: string | undefined;

          if (ticket) {
            unitPrice = Number(ticket.price);
            ticketName = ticket.name;
          }

          if (!attraction && itemDto.entertainment_attraction_id) {
            attraction = attractionMap.get(itemDto.entertainment_attraction_id) || null;
            if (attraction && unitPrice === 0) {
              unitPrice = Number(attraction.price);
            }
          }

          const qty = Math.max(1, Number(itemDto.qty || 1));
          const itemSubtotal = unitPrice * qty;
          calculatedSubtotal += itemSubtotal;

          itemsToCreate.push({
            entertainment_attraction: attraction || undefined,
            ticket: ticket || undefined,
            ticket_name: ticketName,
            unit_price: unitPrice,
            qty,
            subtotal: itemSubtotal,
          });
        }

        // ─── Daily Quota Validation on Entertainment Attraction Level ───
        // Aggregate total requested tickets per attraction in this order
        const requestedQtyByAttraction = new Map<string, { attraction: EntertainmentAttraction; totalQty: number }>();
        for (const it of itemsToCreate) {
          if (it.entertainment_attraction) {
            const attrId = it.entertainment_attraction.id;
            const existing = requestedQtyByAttraction.get(attrId) || {
              attraction: it.entertainment_attraction,
              totalQty: 0,
            };
            existing.totalQty += it.qty || 1;
            requestedQtyByAttraction.set(attrId, existing);
          }
        }

        for (const [attrId, { attraction, totalQty }] of requestedQtyByAttraction) {
          if (attraction.daily_quota && attraction.daily_quota > 0) {
            const countResult = await this.bookingItemRepository
              .createQueryBuilder('item')
              .innerJoin('item.book_entertainment_attraction', 'booking')
              .where('item.entertainment_attraction_id = :attractionId', {
                attractionId: attrId,
              })
              .andWhere('booking.booking_date = :bDate', {
                bDate: parsedBookingDate,
              })
              .andWhere('booking.status NOT IN (:...excludedStatuses)', {
                excludedStatuses: [
                  StatusBookEntertainmentAttraction.CANCELLED,
                ],
              })
              .select('COALESCE(SUM(item.qty), 0)', 'total')
              .getRawOne();

            const bookedCount = Number(countResult?.total || 0);
            const remainingQuota = attraction.daily_quota - bookedCount;
            if (remainingQuota < totalQty) {
              const attractionName =
                attraction.translations?.[0]?.name || attraction.id;
              throw new BadRequestException(
                `Kuota harian untuk atraksi "${attractionName}" pada tanggal ${dto.booking_date} tidak mencukupi. Sisa kuota: ${Math.max(0, remainingQuota)}, diminta: ${totalQty}.`,
              );
            }
          }
        }
      } else if (dto.subtotal) {
        calculatedSubtotal = dto.subtotal;
      }

      // 6. Save in Atomic Transaction (1 hour duration before expiration)
      const oneHourTimer = new Date(Date.now() + 60 * 60 * 1000);
      const savedBooking = await this.dataSource.transaction(async (manager) => {
        const booking = manager.create(BookEntertainmentAttraction, {
          customer: customer || undefined,
          booker: booker || undefined,
          user: user || undefined,
          subtotal: calculatedSubtotal,
          booking_date: parsedBookingDate,
          expired_at: oneHourTimer,
          notes: dto.notes || dto.note || undefined,
          status: StatusBookEntertainmentAttraction.DRAFT,
        });

        const b = await manager.save(BookEntertainmentAttraction, booking);

        if (itemsToCreate.length > 0) {
          const itemEntities = itemsToCreate.map((it) =>
            manager.create(BookEntertainmentAttractionItem, {
              ...it,
              book_entertainment_attraction: b,
            }),
          );
          await manager.save(BookEntertainmentAttractionItem, itemEntities);
        }

        return b;
      });

      return this.findOne(savedBooking.id);
    }

  // ─── Update Booking Details (Booker & Tourists) ─────────────────────────────
  async updateBookingDetails(
    bookingId: string,
    dto: UpdateBookEntertainmentAttractionDto,
    customerId?: string,
  ): Promise<BookEntertainmentAttractionResponse> {
    // 1. Load booking with items, tickets, booker, tourists, and customer
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: [
        'book_entertainment_attraction_items',
        'book_entertainment_attraction_items.ticket',
        'tourists',
        'customer',
        'booker',
      ],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // 2. Access guard for customer
    if (customerId && booking.customer?.id && booking.customer.id !== customerId) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // 3. Only DRAFT bookings can be updated
    if (booking.status !== StatusBookEntertainmentAttraction.DRAFT) {
      throw new BadRequestException(
        `Booking is already in status "${booking.status}". Only draft bookings can update details.`,
      );
    }

    // 4. Update Booker if provided
    const targetBookerId = dto.booker_id || dto.pemesan_id;
    if (targetBookerId) {
      const booker = await this.bookerRepository.findOne({
        where: { id: targetBookerId },
      });
      if (!booker) {
        throw new BadRequestException(`Booker with ID "${targetBookerId}" not found`);
      }
      booking.booker = booker;
    }

    // Update notes if provided
    if (dto.notes !== undefined || dto.note !== undefined) {
      booking.notes = dto.notes || dto.note || undefined;
    }

    // 5. If tourists provided, validate and save them
    if (dto.tourists && dto.tourists.length > 0) {
      // Build a map of ticket_id -> ticket for age validation
      const ticketMap = new Map<string, EntertainmentAttractionTicket>();
      for (const item of booking.book_entertainment_attraction_items) {
        if (item.ticket) {
          ticketMap.set(item.ticket.id, item.ticket);
        }
      }

      const validationErrors: string[] = [];
      const touristsToPersist: Partial<Tourist>[] = [];

      for (const tDto of dto.tourists) {
        let birthDate: Date | null = null;
        let calculatedAge: number | null = null;

        if (tDto.birth_date) {
          birthDate = this.parseBirthDate(tDto.birth_date);
          calculatedAge = this.calculateAge(birthDate);
        }

        // If tourist has a ticket_id, validate age against ticket constraints
        if (tDto.ticket_id && ticketMap.has(tDto.ticket_id)) {
          const ticket = ticketMap.get(tDto.ticket_id)!;

          if (ticket.min_age !== null && ticket.min_age !== undefined) {
            if (calculatedAge === null) {
              validationErrors.push(
                `Tourist "${tDto.name}" must provide birth_date — ticket "${ticket.name}" requires minimum age of ${ticket.min_age} years.`,
              );
              continue;
            }
            if (calculatedAge < ticket.min_age) {
              validationErrors.push(
                `Tourist "${tDto.name}" is ${calculatedAge} years old but ticket "${ticket.name}" requires minimum age of ${ticket.min_age} years.`,
              );
              continue;
            }
          }

          if (ticket.max_age !== null && ticket.max_age !== undefined) {
            if (calculatedAge === null) {
              validationErrors.push(
                `Tourist "${tDto.name}" must provide birth_date — ticket "${ticket.name}" requires maximum age of ${ticket.max_age} years.`,
              );
              continue;
            }
            if (calculatedAge > ticket.max_age) {
              validationErrors.push(
                `Tourist "${tDto.name}" is ${calculatedAge} years old but ticket "${ticket.name}" only allows up to ${ticket.max_age} years. Please use the correct ticket type.`,
              );
              continue;
            }
          }
        }

        touristsToPersist.push({
          book_entertainment_attraction: booking,
          name: tDto.name,
          gender: tDto.gender,
          passport_number: tDto.passport_number,
          phone_number: tDto.phone_number,
          nationality: tDto.nationality,
          birth_date: birthDate ?? undefined,
          age_group: tDto.age_group,
        });
      }

      // Abort if any age validation errors
      if (validationErrors.length > 0) {
        throw new BadRequestException({
          message: 'Age validation failed for one or more tourists',
          errors: validationErrors,
        });
      }

      // Delete existing tourists (re-submit scenario)
      if (booking.tourists && booking.tourists.length > 0) {
        await this.touristRepository.remove(booking.tourists);
      }

      const touristEntities = touristsToPersist.map((t) =>
        this.touristRepository.create({
          ...t,
          book_entertainment_attraction: { id: booking.id } as any,
        }),
      );
      const savedTourists = await this.touristRepository.save(touristEntities);
      booking.tourists = savedTourists;

      // Upgrade status to PENDING + set 1-hour payment timer
      booking.status = StatusBookEntertainmentAttraction.PENDING;
      booking.expired_at = new Date(Date.now() + 60 * 60 * 1000);
    }

    await this.bookingRepository.save(booking);

    return this.findOne(bookingId);
  }

  // ─── Submit Tourists (Alias / Backward Compatibility) ───────────────────────
  async submitTourists(
    bookingId: string,
    dto: SubmitTouristsDto,
    customerId?: string,
  ): Promise<BookEntertainmentAttractionResponse> {
    return this.updateBookingDetails(
      bookingId,
      { tourists: dto.tourists },
      customerId,
    );
  }

  // ─── Find All Bookings ───────────────────────────────────────────────────────
  async findAll(
    query?: FilterBookEntertainmentAttractionDto,
    customerId?: string,
  ): Promise<BookEntertainmentAttractionResponse & { meta?: any }> {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query?.limit || 10)));
    const skip = (page - 1) * limit;

    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.booker', 'booker')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.book_entertainment_attraction_items', 'items')
      .leftJoinAndSelect('items.entertainment_attraction', 'attraction')
      .leftJoinAndSelect('attraction.translations', 'translations')
      .leftJoinAndSelect('items.ticket', 'ticket')
      .leftJoinAndSelect('booking.tourists', 'tourists');

    if (customerId) {
      qb.andWhere('booking.customer_id = :customerId', { customerId });
    }

    if (query?.user_id) {
      qb.andWhere('booking.user_id = :userId', { userId: query.user_id });
    }

    if (query?.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    if (query?.booking_date) {
      const bDate = this.parseBirthDate(query.booking_date);
      qb.andWhere('booking.booking_date = :bDate', { bDate });
    }

    if (query?.notes || query?.note) {
      const notesVal = query.notes || query.note;
      qb.andWhere('booking.notes LIKE :notes', { notes: `%${notesVal}%` });
    }

    if (query?.search) {
      qb.andWhere(
        '(booking.id LIKE :search OR booking.notes LIKE :search OR booker.name LIKE :search OR customer.name LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [bookings, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('booking.created_at', 'DESC')
      .getManyAndCount();

    return {
      message: 'Bookings entertainment attraction retrieved successfully',
      data: bookings.map((b) => this.mapToResponseData(b)) as any,
      meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    };
  }

  // ─── Find One Booking ────────────────────────────────────────────────────────
  async findOne(
    id: string,
    customerId?: string,
  ): Promise<BookEntertainmentAttractionResponse> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'booker',
        'user',
        'book_entertainment_attraction_items',
        'book_entertainment_attraction_items.entertainment_attraction',
        'book_entertainment_attraction_items.entertainment_attraction.translations',
        'book_entertainment_attraction_items.ticket',
        'tourists',
      ],
    });

    if (!booking) {
      throw new NotFoundException(
        `Booking entertainment attraction with ID ${id} not found`,
      );
    }

    if (customerId && booking.customer?.id && booking.customer.id !== customerId) {
      throw new NotFoundException(
        `Booking entertainment attraction with ID ${id} not found`,
      );
    }

    // Lazy check: If booking has expired while waiting for background cleaner, treat as CANCELLED
    if (
      (booking.status === StatusBookEntertainmentAttraction.DRAFT ||
        booking.status === StatusBookEntertainmentAttraction.PENDING) &&
      booking.expired_at &&
      new Date(booking.expired_at) <= new Date()
    ) {
      booking.status = StatusBookEntertainmentAttraction.CANCELLED;
      await this.bookingRepository.update(booking.id, {
        status: StatusBookEntertainmentAttraction.CANCELLED,
      });
    }

    return {
      message: 'Booking entertainment attraction retrieved successfully',
      data: this.mapToResponseData(booking),
    };
  }

  // ─── Cancel Booking (Customer / Admin) ───────────────────────────────────────
  async cancelBooking(
    id: string,
    customerId?: string,
    user?: User,
  ): Promise<BookEntertainmentAttractionResponse> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['customer', 'booker', 'user', 'tourists', 'book_entertainment_attraction_items'],
    });

    if (!booking) {
      throw new NotFoundException(
        `Booking entertainment attraction with ID ${id} not found`,
      );
    }

    if (customerId && booking.customer?.id && booking.customer.id !== customerId) {
      throw new NotFoundException(
        `Booking entertainment attraction with ID ${id} not found`,
      );
    }

    if (booking.status === StatusBookEntertainmentAttraction.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === StatusBookEntertainmentAttraction.COMPLETED) {
      throw new BadRequestException(
        'Cannot cancel a completed booking. Please request a refund instead.',
      );
    }

    booking.status = StatusBookEntertainmentAttraction.CANCELLED;
    booking.expired_at = undefined;
    if (user) {
      booking.user = user;
    }

    await this.bookingRepository.save(booking);

    return {
      message: 'Booking entertainment attraction cancelled successfully',
      data: this.mapToResponseData(booking),
    };
  }

  // ─── Update Status by Admin (Tracks User ID via RBAC) ───────────────────────
  async updateStatus(
    id: string,
    status: StatusBookEntertainmentAttraction,
    user?: User,
  ): Promise<BookEntertainmentAttractionResponse> {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(
        `Booking entertainment attraction with ID ${id} not found`,
      );
    }
    booking.status = status;
    if (user) {
      booking.user = user;
    }
    await this.bookingRepository.save(booking);
    return this.findOne(id);
  }

  // ─── Remove Booking ──────────────────────────────────────────────────────────
  async remove(id: string): Promise<BookEntertainmentAttractionResponse> {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(
        `Booking entertainment attraction with ID ${id} not found`,
      );
    }
    await this.bookingRepository.softRemove(booking);
    return { message: 'Booking entertainment attraction deleted successfully' };
  }
}
