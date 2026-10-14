import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource, In, Repository } from 'typeorm';
import { Logger } from 'winston';
import { Booker } from '../bookers/entities/booker.entity';
import { BookersService } from '../bookers/bookers.service';
import { Customer } from '../customers/entities/customer.entity';
import { DocumentVisaPackage } from '../document-visas/entities/document-visa-package.entity';
import { DocumentVisaRequirement } from '../document-visas/entities/document-visa-requirement.entity';
import { DocumentVisa } from '../document-visas/entities/document-visa.entity';
import { User } from '../users/entities/user.entity';
import { PaymentStatus } from '../payments/entities/payment.entity';
import {
  CreateBookDocumentVisaDto,
} from './dto/create-book-document-visa.dto';
import { FilterBookDocumentVisaDto } from './dto/filter-book-document-visa.dto';
import { UpdateBookDocumentVisaDetailsDto } from './dto/update-book-document-visa-details.dto';
import {
  ReviewApplicantFileDto,
  UploadApplicantFileDto,
} from './dto/upload-applicant-file.dto';
import { UpdateBookDocumentVisaStatusDto } from './dto/update-booking-status.dto';
import {
  BookDocumentApplicantFile,
  FileReviewStatus,
} from './entities/book-document-applicant-file.entity';
import {
  ApplicantStatus,
  BookDocumentVisaApplicant,
} from './entities/book-document-visa-applicant.entity';
import { BookDocumentVisaItem } from './entities/book-document-visa-item.entity';
import { BookDocumentVisaLog } from './entities/book-document-visa-log.entity';
import {
  BookDocumentVisa,
  StatusBookDocumentVisa,
} from './entities/book-document-visa.entity';
import {
  BookDocumentVisaData,
  BookDocumentVisaResponse,
} from '../../types/response/book-document-visa.type';

@Injectable()
export class BookDocumentVisasService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(BookDocumentVisa)
    private readonly bookingRepository: Repository<BookDocumentVisa>,
    @InjectRepository(BookDocumentVisaItem)
    private readonly itemRepository: Repository<BookDocumentVisaItem>,
    @InjectRepository(BookDocumentVisaApplicant)
    private readonly applicantRepository: Repository<BookDocumentVisaApplicant>,
    @InjectRepository(BookDocumentApplicantFile)
    private readonly fileRepository: Repository<BookDocumentApplicantFile>,
    @InjectRepository(BookDocumentVisaLog)
    private readonly logRepository: Repository<BookDocumentVisaLog>,
    @InjectRepository(DocumentVisa)
    private readonly documentVisaRepository: Repository<DocumentVisa>,
    @InjectRepository(DocumentVisaPackage)
    private readonly packageRepository: Repository<DocumentVisaPackage>,
    @InjectRepository(DocumentVisaRequirement)
    private readonly requirementRepository: Repository<DocumentVisaRequirement>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Booker)
    private readonly bookerRepository: Repository<Booker>,
    private readonly bookersService: BookersService,
    private readonly dataSource: DataSource,
  ) {}

  private parseDate(dateStr?: string): Date | undefined {
    if (!dateStr) return undefined;
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
      const [d, m, y] = dateStr.split('-');
      return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    }
    return new Date(dateStr);
  }

  // ─── Create Booking ────────────────────────────────────────────────────────
  async create(
    dto: CreateBookDocumentVisaDto,
    customerId?: string,
    userParam?: User,
  ): Promise<BookDocumentVisaResponse> {
    // 1. Resolve Document Visa and Requirements
    const documentVisa = await this.documentVisaRepository.findOne({
      where: { id: dto.document_visa_id, is_active: true },
      relations: ['country', 'origin_country', 'translations', 'requirements'],
    });

    if (!documentVisa) {
      throw new NotFoundException(`Document & Visa catalog with ID ${dto.document_visa_id} not found or inactive`);
    }

    // 2. Resolve Package
    const visaPackage = await this.packageRepository.findOne({
      where: {
        id: dto.package_id,
        document_visa: { id: dto.document_visa_id },
        is_active: true,
      },
    });

    if (!visaPackage) {
      throw new NotFoundException(`Package with ID ${dto.package_id} not found for this visa`);
    }

    // 3. Resolve Customer & Booker
    const targetCustomerId = customerId || dto.customer_id;
    let customer: Customer | null = null;
    if (targetCustomerId) {
      customer = await this.customerRepository.findOne({
        where: { id: targetCustomerId },
      });
    }

    // Resolve Booker (distinct contact person from account owner / customer)
    const bId = dto.booker?.id || dto.booker_id;
    const bName = dto.booker?.name || dto.booker_name;
    const bEmail = dto.booker?.email || dto.booker_email;
    const bPhone =
      dto.booker?.phone_number ||
      dto.booker_phone_number ||
      dto.booker_phone;

    let booker: Booker | null = null;
    if (bId) {
      booker = await this.bookerRepository.findOne({
        where: { id: bId },
      });
      if (!booker) {
        throw new NotFoundException(`Booker with ID ${bId} not found`);
      }
    } else if (bName && bEmail && bPhone) {
      if (customer) {
        booker = await this.bookersService.findOrCreateBooker(customer.id, {
          booker_name: bName,
          booker_email: bEmail,
          booker_phone: bPhone,
        });
      } else {
        let existingBooker = await this.bookerRepository.findOne({
          where: [{ email: bEmail }, { phone_number: bPhone }],
        });
        if (existingBooker) {
          booker = existingBooker;
        } else {
          booker = await this.bookerRepository.save(
            this.bookerRepository.create({
              name: bName,
              email: bEmail,
              phone_number: bPhone,
            }),
          );
        }
      }
    } else if (customer && !bId && !bName) {
      // Fallback: If customer is provided and no separate booker is specified,
      // associate customer profile as booker automatically
      if (customer.email && customer.phone_number) {
        booker = await this.bookersService.findOrCreateBooker(customer.id, {
          booker_name: customer.name,
          booker_email: customer.email,
          booker_phone: customer.phone_number,
        });
      }
    }

    // 4. Calculate Pricing & Applicant Count
    const applicantCount =
      dto.applicants && dto.applicants.length > 0
        ? dto.applicants.length
        : dto.applicant_count || dto.qty || dto.items?.[0]?.qty || 1;

    const unitPrice =
      Number(visaPackage.total_price || 0) > 0
        ? Number(visaPackage.total_price)
        : Number(visaPackage.embassy_fee || 0) + Number(visaPackage.service_fee || 0);
    const totalPrice = unitPrice * applicantCount;

    const targetTravelDate = this.parseDate(dto.target_travel_date);
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour expiration window for draft

    // 5. Execute Atomic Transaction
    const savedBooking = await this.dataSource.transaction(async (manager) => {
      // Create Header
      const booking = manager.create(BookDocumentVisa, {
        customer: customer || undefined,
        booker: booker || undefined,
        user: userParam || undefined,
        document_visa: documentVisa,
        package: visaPackage,
        applicant_count: applicantCount,
        total_price: totalPrice,
        target_travel_date: targetTravelDate,
        shipping_address: dto.shipping_address,
        note: dto.note || dto.notes || undefined,
        status: StatusBookDocumentVisa.DRAFT,
        expired_at: expiredAt,
      });

      const savedB = await manager.save(BookDocumentVisa, booking);

      // Create Line Item
      const packageName =
        typeof visaPackage.name === 'string'
          ? visaPackage.name
          : (visaPackage.name as any)?.en || (visaPackage.name as any)?.id || 'Standard Package';

      const lineItem = manager.create(BookDocumentVisaItem, {
        book_document_visa: savedB,
        document_visa: documentVisa,
        package: visaPackage,
        package_name: packageName,
        unit_price: unitPrice,
        qty: applicantCount,
        subtotal: totalPrice,
      });
      await manager.save(BookDocumentVisaItem, lineItem);

      // Create Applicants (if provided)
      if (dto.applicants && dto.applicants.length > 0) {
        const applicantsToSave = dto.applicants.map((appDto) =>
          manager.create(BookDocumentVisaApplicant, {
            book_document_visa: savedB,
            full_name: appDto.full_name,
            gender: appDto.gender,
            birth_date: this.parseDate(appDto.birth_date),
            birth_place: appDto.birth_place,
            nationality: appDto.nationality,
            passport_number: appDto.passport_number,
            passport_issue_date: this.parseDate(appDto.passport_issue_date),
            passport_expiry_date: this.parseDate(appDto.passport_expiry_date),
            occupation: appDto.occupation,
            tourist: appDto.tourist_id ? ({ id: appDto.tourist_id } as any) : undefined,
            status: ApplicantStatus.PENDING_DOCUMENT,
          }),
        );

        await manager.save(BookDocumentVisaApplicant, applicantsToSave);
      }

      // Create initial audit log
      const initialLog = manager.create(BookDocumentVisaLog, {
        book_document_visa: savedB,
        user: userParam || undefined,
        status: StatusBookDocumentVisa.DRAFT,
        title: 'Booking Created',
        note: `Pengajuan visa dibuat untuk ${applicantCount} pemohon. Silakan lengkapi data pemesan dan pemohon pada halaman order untuk lanjut ke pembayaran.`,
        is_visible_to_customer: true,
      });
      await manager.save(BookDocumentVisaLog, initialLog);

      return savedB;
    });

    this.logger.debug(`Success create document visa booking: ${savedBooking.id}`);
    const result = await this.findOne(savedBooking.id);
    return {
      message: 'Booking document visa created successfully',
      data: result.data,
    };
  }

  // ─── Find All Bookings (QueryBuilder with Zero N+1) ─────────────────────────
  async findAll(
    query?: FilterBookDocumentVisaDto,
    customerId?: string,
  ): Promise<BookDocumentVisaResponse> {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query?.limit || 10)));
    const skip = (page - 1) * limit;

    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.booker', 'booker')
      .leftJoinAndSelect('booking.user', 'user')
      .leftJoinAndSelect('booking.document_visa', 'document_visa')
      .leftJoinAndSelect('document_visa.translations', 'visa_translations')
      .leftJoinAndSelect('document_visa.country', 'visa_country')
      .leftJoinAndSelect('booking.package', 'package')
      .leftJoinAndSelect('booking.items', 'items')
      .leftJoinAndSelect('items.package', 'item_package')
      .leftJoinAndSelect('booking.applicants', 'applicants')
      .leftJoinAndSelect('applicants.files', 'files')
      .leftJoinAndSelect('files.requirement', 'file_requirement');

    if (customerId) {
      qb.andWhere('booking.customer.id = :customerId', { customerId });
    } else if (query?.customer_id) {
      qb.andWhere('booking.customer.id = :cId', { cId: query.customer_id });
    }

    if (query?.user_id) {
      qb.andWhere('booking.user.id = :userId', { userId: query.user_id });
    }

    if (query?.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    if (query?.document_visa_id) {
      qb.andWhere('booking.document_visa.id = :dvId', {
        dvId: query.document_visa_id,
      });
    }

    if (query?.start_date) {
      qb.andWhere('booking.createdAt >= :startDate', {
        startDate: new Date(query.start_date),
      });
    }

    if (query?.end_date) {
      qb.andWhere('booking.createdAt <= :endDate', {
        endDate: new Date(query.end_date),
      });
    }

    if (query?.note) {
      qb.andWhere('booking.note LIKE :note', { note: `%${query.note}%` });
    }

    if (query?.search) {
      qb.andWhere(
        '(booking.id LIKE :search OR booking.tracking_number LIKE :search OR booking.embassy_application_id LIKE :search OR booking.note LIKE :search OR applicants.full_name LIKE :search OR visa_translations.title LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [bookings, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('booking.createdAt', 'DESC')
      .getManyAndCount();

    return {
      message: 'Bookings document visa retrieved successfully',
      datas: bookings.map((b) => this.mapToResponseData(b)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Find One Booking ───────────────────────────────────────────────────────
  async findOne(
    id: string,
    customerId?: string,
  ): Promise<BookDocumentVisaResponse> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'booker',
        'user',
        'document_visa',
        'document_visa.translations',
        'document_visa.country',
        'package',
        'items',
        'items.document_visa',
        'items.package',
        'applicants',
        'applicants.files',
        'applicants.files.requirement',
        'payments',
      ],
    });

    if (!booking) {
      throw new NotFoundException(`Booking document visa with ID ${id} not found`);
    }

    if (customerId && booking.customer?.id !== customerId) {
      throw new NotFoundException(`Booking document visa with ID ${id} not found`);
    }

    // Check if there is any successful payment for this booking
    const hasSuccessfulPayment = booking.payments?.some(
      (p) =>
        p.status === PaymentStatus.SUCCES ||
        String(p.status).toLowerCase() === 'success' ||
        String(p.status).toLowerCase() === 'paid',
    );

    if (hasSuccessfulPayment) {
      // If paid, it must never be cancelled or left as draft/pending due to expiration
      if (
        booking.status === StatusBookDocumentVisa.DRAFT ||
        booking.status === StatusBookDocumentVisa.PENDING ||
        booking.status === StatusBookDocumentVisa.CANCELLED
      ) {
        booking.status = StatusBookDocumentVisa.PAID;
        booking.expired_at = undefined;
        await this.bookingRepository.update(booking.id, {
          status: StatusBookDocumentVisa.PAID,
          expired_at: null,
        });
      }
    } else {
      // Lazy check: If expired in DRAFT/PENDING and not paid, mark as CANCELLED
      if (
        (booking.status === StatusBookDocumentVisa.DRAFT ||
          booking.status === StatusBookDocumentVisa.PENDING) &&
        booking.expired_at &&
        new Date(booking.expired_at) <= new Date()
      ) {
        booking.status = StatusBookDocumentVisa.CANCELLED;
        await this.bookingRepository.update(booking.id, {
          status: StatusBookDocumentVisa.CANCELLED,
        });
      }
    }

    return {
      message: 'Booking document visa retrieved successfully',
      data: this.mapToResponseData(booking),
    };
  }

  // ─── Update Booking Order Details (Booker, Notes, Applicants) ───────────────
  async updateBookingDetails(
    id: string,
    dto: UpdateBookDocumentVisaDetailsDto,
    customerId?: string,
    userParam?: User,
  ): Promise<BookDocumentVisaResponse> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: [
        'customer',
        'booker',
        'user',
        'document_visa',
        'package',
        'applicants',
        'items',
      ],
    });

    if (!booking) {
      throw new NotFoundException(`Booking document visa with ID ${id} not found`);
    }

    if (customerId && booking.customer?.id && booking.customer.id !== customerId) {
      throw new NotFoundException(`Booking document visa with ID ${id} not found`);
    }

    if (
      booking.status !== StatusBookDocumentVisa.DRAFT &&
      booking.status !== StatusBookDocumentVisa.PENDING
    ) {
      throw new BadRequestException(
        `Booking is already in status "${booking.status}". Only draft or pending bookings can update order details.`,
      );
    }

    // 1. Update Booker if provided
    const bId = dto.booker_id || dto.booker?.id;
    const bName = dto.booker?.name;
    const bEmail = dto.booker?.email;
    const bPhone = dto.booker?.phone_number;

    if (bId) {
      const existingBooker = await this.bookerRepository.findOne({ where: { id: bId } });
      if (!existingBooker) {
        throw new NotFoundException(`Booker with ID ${bId} not found`);
      }
      booking.booker = existingBooker;
    } else if (bName && bEmail && bPhone) {
      if (booking.customer) {
        booking.booker = await this.bookersService.findOrCreateBooker(booking.customer.id, {
          booker_name: bName,
          booker_email: bEmail,
          booker_phone: bPhone,
        });
      } else {
        let existing = await this.bookerRepository.findOne({
          where: [{ email: bEmail }, { phone_number: bPhone }],
        });
        if (existing) {
          booking.booker = existing;
        } else {
          booking.booker = await this.bookerRepository.save(
            this.bookerRepository.create({
              name: bName,
              email: bEmail,
              phone_number: bPhone,
            }),
          );
        }
      }
    }

    // 2. Update note / notes
    if (dto.note !== undefined || dto.notes !== undefined) {
      booking.note = dto.notes || dto.note || undefined;
    }

    // 3. Update shipping address / target travel date
    if (dto.shipping_address !== undefined) {
      booking.shipping_address = dto.shipping_address;
    }
    if (dto.target_travel_date) {
      booking.target_travel_date = this.parseDate(dto.target_travel_date);
    }

    // 4. Update Applicants if provided
    if (dto.applicants && dto.applicants.length > 0) {
      // Remove existing applicants if any
      if (booking.applicants && booking.applicants.length > 0) {
        await this.applicantRepository.remove(booking.applicants);
      }

      const newApplicants = dto.applicants.map((appDto) =>
        this.applicantRepository.create({
          book_document_visa: booking,
          full_name: appDto.full_name,
          gender: appDto.gender,
          birth_date: this.parseDate(appDto.birth_date),
          birth_place: appDto.birth_place,
          nationality: appDto.nationality,
          passport_number: appDto.passport_number,
          passport_issue_date: this.parseDate(appDto.passport_issue_date),
          passport_expiry_date: this.parseDate(appDto.passport_expiry_date),
          occupation: appDto.occupation,
          tourist: appDto.tourist_id ? ({ id: appDto.tourist_id } as any) : undefined,
          status: ApplicantStatus.PENDING_DOCUMENT,
        }),
      );
      const savedApplicants = await this.applicantRepository.save(newApplicants);
      booking.applicants = savedApplicants;

      // Update applicant count & recalculate total price
      const firstItem = booking.items?.[0];
      const itemUnitPrice = firstItem
        ? Number(firstItem.unit_price)
        : Number(booking.package?.total_price || 0);

      booking.applicant_count = dto.applicants.length;
      booking.total_price = itemUnitPrice * booking.applicant_count;

      // Update or create line item
      if (firstItem) {
        firstItem.qty = booking.applicant_count;
        firstItem.subtotal = booking.total_price;
        await this.itemRepository.save(firstItem);
      } else {
        const packageName =
          typeof booking.package?.name === 'string'
            ? booking.package.name
            : (booking.package?.name as any)?.en || (booking.package?.name as any)?.id || 'Standard Package';
        const newItem = this.itemRepository.create({
          book_document_visa: booking,
          document_visa: booking.document_visa,
          package: booking.package,
          package_name: packageName,
          unit_price: itemUnitPrice,
          qty: booking.applicant_count,
          subtotal: booking.total_price,
        });
        await this.itemRepository.save(newItem);
      }
    }

    // 5. Update Status to PENDING and set 1-hour expiration window for payment
    booking.status = StatusBookDocumentVisa.PENDING;
    booking.expired_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour payment window

    await this.bookingRepository.save(booking);

    // 6. Audit log
    await this.logRepository.save(
      this.logRepository.create({
        book_document_visa: booking,
        user: userParam || undefined,
        status: StatusBookDocumentVisa.PENDING,
        title: 'Order Details Submitted',
        note: 'Customer melengkapi data pemesan dan pemohon. Siap lanjut ke pembayaran.',
        is_visible_to_customer: true,
      }),
    );

    return this.findOne(id);
  }

  // ─── Upload Applicant File ──────────────────────────────────────────────────
  async uploadApplicantFile(
    bookingId: string,
    applicantId: string,
    dto: UploadApplicantFileDto,
    customerId?: string,
  ): Promise<BookDocumentVisaResponse> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['customer', 'applicants'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (customerId && booking.customer?.id && booking.customer.id !== customerId) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    const applicant = await this.applicantRepository.findOne({
      where: { id: applicantId, book_document_visa: { id: bookingId } },
    });

    if (!applicant) {
      throw new NotFoundException(`Applicant with ID ${applicantId} not found in this booking`);
    }

    const requirement = await this.requirementRepository.findOne({
      where: { id: dto.requirement_id },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement with ID ${dto.requirement_id} not found`);
    }

    // Check if file for this requirement already exists
    let existingFile = await this.fileRepository.findOne({
      where: {
        applicant: { id: applicantId },
        requirement: { id: dto.requirement_id },
      },
    });

    if (existingFile) {
      existingFile.file_url = dto.file_url;
      existingFile.file_name = dto.file_name;
      existingFile.file_size_bytes = dto.file_size_bytes;
      existingFile.review_status = FileReviewStatus.PENDING;
      existingFile.rejection_note = undefined;
      await this.fileRepository.save(existingFile);
    } else {
      const newFile = this.fileRepository.create({
        applicant,
        requirement,
        file_url: dto.file_url,
        file_name: dto.file_name,
        file_size_bytes: dto.file_size_bytes,
        review_status: FileReviewStatus.PENDING,
      });
      await this.fileRepository.save(newFile);
    }

    // If booking was REVISION_REQUIRED or PAID, transition to DOCUMENTS_SUBMITTED
    if (
      booking.status === StatusBookDocumentVisa.PAID ||
      booking.status === StatusBookDocumentVisa.REVISION_REQUIRED
    ) {
      booking.status = StatusBookDocumentVisa.DOCUMENTS_SUBMITTED;
      await this.bookingRepository.save(booking);

      await this.logRepository.save(
        this.logRepository.create({
          book_document_visa: booking,
          status: StatusBookDocumentVisa.DOCUMENTS_SUBMITTED,
          title: 'Documents Submitted',
          note: `Dokumen persyaratan baru saja diunggah untuk pemohon ${applicant.full_name}.`,
          is_visible_to_customer: true,
        }),
      );
    }

    return this.findOne(bookingId);
  }

  // ─── Review Applicant File (Admin / Staff) ──────────────────────────────────
  async reviewApplicantFile(
    fileId: string,
    dto: ReviewApplicantFileDto,
    reviewer: User,
  ): Promise<any> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['applicant', 'applicant.book_document_visa'],
    });

    if (!file) {
      throw new NotFoundException(`Applicant file with ID ${fileId} not found`);
    }

    file.review_status = dto.review_status;
    file.rejection_note = dto.rejection_note;
    file.reviewer = reviewer;
    file.reviewed_at = new Date();

    await this.fileRepository.save(file);

    return {
      message: 'File review updated successfully',
      data: {
        id: file.id,
        review_status: file.review_status,
        rejection_note: file.rejection_note,
        reviewed_at: file.reviewed_at,
      },
    };
  }

  // ─── Update Booking Status (Admin / Staff) ──────────────────────────────────
  async updateStatus(
    id: string,
    dto: UpdateBookDocumentVisaStatusDto,
    user?: User,
  ): Promise<BookDocumentVisaResponse> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['customer', 'applicants'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking document visa with ID ${id} not found`);
    }

    booking.status = dto.status;
    if (user) {
      booking.user = user;
    }
    if (dto.admin_notes !== undefined) {
      booking.admin_notes = dto.admin_notes;
    }
    if (dto.rejection_reason !== undefined) {
      booking.rejection_reason = dto.rejection_reason;
    }
    if (dto.appointment_date !== undefined) {
      booking.appointment_date = this.parseDate(dto.appointment_date);
    }
    if (dto.appointment_location !== undefined) {
      booking.appointment_location = dto.appointment_location;
    }
    if (dto.embassy_application_id !== undefined) {
      booking.embassy_application_id = dto.embassy_application_id;
    }
    if (dto.tracking_number !== undefined) {
      booking.tracking_number = dto.tracking_number;
    }

    if (
      dto.status !== StatusBookDocumentVisa.DRAFT &&
      dto.status !== StatusBookDocumentVisa.PENDING
    ) {
      booking.expired_at = undefined;
    }

    await this.bookingRepository.save(booking);

    // Create Audit Log Entry
    const isPaid = dto.status === StatusBookDocumentVisa.PAID;
    const defaultTitle = isPaid
      ? 'Payment Confirmed'
      : `Status updated to ${dto.status}`;
    const defaultNote = isPaid
      ? 'Pembayaran berhasil dikonfirmasi. Silakan hubungi Customer Service untuk konsultasi dan pengiriman berkas persyaratan.'
      : dto.admin_notes || dto.rejection_reason || undefined;

    const log = this.logRepository.create({
      book_document_visa: booking,
      user,
      status: dto.status,
      title: dto.log_title || defaultTitle,
      note: dto.log_note || defaultNote,
      is_visible_to_customer: true,
    });
    await this.logRepository.save(log);

    return this.findOne(id);
  }

  // ─── Cancel Booking (Customer / Admin) ──────────────────────────────────────
  async cancelBooking(
    id: string,
    customerId?: string,
    user?: User,
  ): Promise<BookDocumentVisaResponse> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking document visa with ID ${id} not found`);
    }

    if (customerId && booking.customer?.id !== customerId) {
      throw new NotFoundException(`Booking document visa with ID ${id} not found`);
    }

    if (booking.status === StatusBookDocumentVisa.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (
      booking.status === StatusBookDocumentVisa.APPROVED ||
      booking.status === StatusBookDocumentVisa.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot cancel a processed/completed visa application.',
      );
    }

    if (
      customerId &&
      (booking.status === StatusBookDocumentVisa.SUBMITTED_TO_EMBASSY ||
        booking.status === StatusBookDocumentVisa.APPOINTMENT_SCHEDULED)
    ) {
      throw new BadRequestException(
        'Cannot cancel booking once documents are submitted to embassy or appointment is scheduled. Please contact customer service.',
      );
    }

    booking.status = StatusBookDocumentVisa.CANCELLED;
    booking.expired_at = undefined;
    if (user) {
      booking.user = user;
    }

    await this.bookingRepository.save(booking);

    // Audit log
    await this.logRepository.save(
      this.logRepository.create({
        book_document_visa: booking,
        user,
        status: StatusBookDocumentVisa.CANCELLED,
        title: 'Booking Cancelled',
        note: customerId ? 'Cancelled by customer' : 'Cancelled by administrator',
        is_visible_to_customer: true,
      }),
    );

    return this.findOne(id);
  }

  // ─── Delete Booking (Soft Delete) ───────────────────────────────────────────
  async remove(id: string): Promise<{ message: string }> {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) {
      throw new NotFoundException(`Booking document visa with ID ${id} not found`);
    }

    await this.bookingRepository.softRemove(booking);
    return { message: `Booking document visa with ID ${id} deleted successfully` };
  }

  // ─── Map to Response Data (Zero N+1) ────────────────────────────────────────
  private mapToResponseData(b: BookDocumentVisa): BookDocumentVisaData {
    const primaryTranslation =
      b.document_visa?.translations?.find((t) => t.language_code === 'en') ||
      b.document_visa?.translations?.[0];

    return {
      id: b.id,
      customer_id: b.customer?.id,
      customer_name: b.customer?.name,
      customer_email: b.customer?.email,
      booker_id: b.booker?.id,
      booker_name: b.booker?.name,
      booker_email: b.booker?.email,
      booker_phone: b.booker?.phone_number,
      user_id: b.user?.id,
      user_name: b.user?.name,
      document_visa_id: b.document_visa?.id,
      document_visa_title: primaryTranslation?.title || b.document_visa?.id,
      country_name: b.document_visa?.country?.name,
      package_id: b.package?.id,
      package_name:
        this.resolveI18nString(b.package?.name) ||
        (b.items?.[0]?.package_name) ||
        undefined,
      processing_time_days: b.package?.processing_time_days,
      applicant_count: b.applicant_count,
      unit_price: Number(b.items?.[0]?.unit_price || 0),
      total_price: Number(b.total_price),
      target_travel_date: b.target_travel_date,
      status: b.status,
      appointment_date: b.appointment_date,
      appointment_location: b.appointment_location,
      embassy_application_id: b.embassy_application_id,
      tracking_number: b.tracking_number,
      shipping_address: b.shipping_address,
      note: b.note || null,
      rejection_reason: b.rejection_reason,
      admin_notes: b.admin_notes,
      expired_at: b.expired_at,
      items: (b.items || []).map((item) => ({
        id: item.id,
        document_visa_id: item.document_visa?.id,
        package_id: item.package?.id,
        package_name: item.package_name,
        unit_price: Number(item.unit_price),
        qty: item.qty,
        subtotal: Number(item.subtotal),
        created_at: item.created_at,
      })),
      applicants: (b.applicants || []).map((app) => ({
        id: app.id,
        tourist_id: app.tourist?.id,
        full_name: app.full_name,
        gender: app.gender,
        birth_date: app.birth_date,
        birth_place: app.birth_place,
        nationality: app.nationality,
        passport_number: app.passport_number,
        passport_issue_date: app.passport_issue_date,
        passport_expiry_date: app.passport_expiry_date,
        occupation: app.occupation,
        visa_document_url: app.visa_document_url,
        status: app.status,
        files: (app.files || []).map((f) => ({
          id: f.id,
          requirement_id: f.requirement?.id,
          requirement_name: this.resolveI18nString(f.requirement?.name) || undefined,
          file_url: f.file_url,
          file_name: f.file_name,
          file_size_bytes: f.file_size_bytes ? Number(f.file_size_bytes) : undefined,
          review_status: f.review_status,
          rejection_note: f.rejection_note,
          reviewed_at: f.reviewed_at,
          created_at: f.createdAt,
        })),
        created_at: app.createdAt,
      })),
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    };
  }

  private resolveI18nString(val: any): string {
    if (!val && val !== 0) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return (
        val.id ||
        val.en ||
        val.tr ||
        (Object.values(val)[0] as string) ||
        ''
      );
    }
    return String(val);
  }
}
