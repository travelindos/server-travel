import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  DocumentCategoryResponse,
  DocumentVisaData,
  DocumentVisaResponse,
} from '../../types/response/document-visa.type';
import { Country } from '../locations/entities/country.entity';
import {
  CreateDocumentVisaDto,
  UpdateDocumentVisaDto,
} from './dto/create-document-visa.dto';
import { FilterDocumentVisaDto } from './dto/filter-document-visa.dto';
import { DocumentCategory } from './entities/document-category.entity';
import { DocumentVisaPackage } from './entities/document-visa-package.entity';
import { DocumentVisaRequirement } from './entities/document-visa-requirement.entity';
import { DocumentVisaTranslation } from './entities/document-visa-translation.entity';
import {
  DocumentVisa,
  EntryType,
  VisaType,
} from './entities/document-visa.entity';

@Injectable()
export class DocumentVisasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DocumentVisa)
    private readonly documentVisaRepository: Repository<DocumentVisa>,
    @InjectRepository(DocumentCategory)
    private readonly categoryRepository: Repository<DocumentCategory>,
    @InjectRepository(DocumentVisaTranslation)
    private readonly translationRepository: Repository<DocumentVisaTranslation>,
    @InjectRepository(DocumentVisaPackage)
    private readonly packageRepository: Repository<DocumentVisaPackage>,
    @InjectRepository(DocumentVisaRequirement)
    private readonly requirementRepository: Repository<DocumentVisaRequirement>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  // ─── Slug Generator Helper ──────────────────────────────────────────────────
  private generateSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() +
      '-' +
      Math.random().toString(36).substring(2, 6)
    );
  }

  // ─── Multi-Language Text Object Helper ──────────────────────────────────────
  private formatI18nValue(value: any): Record<string, string> | string {
    if (!value) return '';
    if (typeof value === 'object' && value !== null) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch {
        return value;
      }
      return value;
    }
    return String(value);
  }

  // ─── Resolve I18n String Helper ─────────────────────────────────────────────
  private resolveI18nValue(value: any, lang?: string): string {
    if (!value && value !== 0) return '';
    const targetLang = (lang || 'en').toLowerCase();

    let obj: any = value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          obj = JSON.parse(trimmed);
        } catch {
          obj = value;
        }
      }
    }

    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      if (obj[targetLang]) return String(obj[targetLang]);
      if (targetLang === 'en' && obj.en) return String(obj.en);
      if (targetLang === 'id' && obj.id) return String(obj.id);
      if (targetLang === 'tr' && obj.tr) return String(obj.tr);
      if (obj.en) return String(obj.en);
      if (obj.id) return String(obj.id);
      const firstVal = Object.values(obj)[0];
      if (firstVal) return String(firstVal);
    }

    const strVal = String(obj || '');
    if (targetLang === 'en') {
      return this.translateIdToEnFallback(strVal);
    }
    return strVal;
  }

  // ─── Fallback Indonesian to English Dictionary ──────────────────────────────
  private translateIdToEnFallback(text: string): string {
    if (!text) return '';
    const trimmed = text.trim();

    const dictionary: Record<string, string> = {
      'Scan Paspor Asli (Halaman Biodata)': 'Original Passport Scan (Biodata Page)',
      'Pasfoto Berwarna Terbaru (Format Visa)': 'Recent Color Photograph (Visa Format)',
      'Bukti Reservasi Tiket Pesawat & Hotel': 'Roundtrip Flight & Hotel Reservation Booking Proof',
      'Kilat VIP Express (2 Hari Kerja)': 'Express VIP Fast Track (2 Business Days)',
      'Prioritas verifikasi cepat dan antrean jalur kilat.': 'High-priority verification and fast-track processing.',
      'Reguler Standar (5-7 Hari Kerja)': 'Standard Regular (5-7 Business Days)',
      'Pengurusan reguler sesuai jadwal standar kedutaan.': 'Standard processing according to embassy schedule.',
      'Tanpa Wawancara': 'No Interview Required',
      'Perlu Wawancara': 'Interview Required',
      'Wajib Hadir VFS': 'In-Person VFS Required',
      'Digital Online': 'Digital Online',
      '180 Hari': '180 Days',
      '2 Hari Kerja': '2 Business Days',
      '5 Hari Kerja': '5 Business Days',
      '5-7 Hari Kerja': '5-7 Business Days',
      'Sesuai Kebijakan': 'As per consular policy',
    };

    if (dictionary[trimmed]) {
      return dictionary[trimmed];
    }

    let result = text
      .replace(/(\d+)\s*Hari\s*Kerja/gi, '$1 Business Days')
      .replace(/(\d+)\s*Hari/gi, '$1 Days')
      .replace(/Biaya Kedubes/gi, 'Embassy Fee')
      .replace(/Biaya Layanan/gi, 'Service Fee')
      .replace(/Proses:/gi, 'Processing:')
      .replace(/Estimasi:/gi, 'Estimated:')
      .replace(/Tanpa Wawancara/gi, 'No Interview Required')
      .replace(/Perlu Wawancara/gi, 'Interview Required');

    return result;
  }

  // ─── Response Formatter ──────────────────────────────────────────────────────
  private mapToResponseData(
    item: DocumentVisa,
    lang?: string,
  ): DocumentVisaData {
    const primaryTranslation =
      (item.translations || []).find((t) => t.language_code === lang) ||
      (item.translations || []).find((t) => t.language_code === 'en') ||
      (item.translations || [])[0];

    const firstPkgDays = item.packages?.[0]?.processing_time_days;
    const isId = lang === 'id';

    return {
      id: item.id,
      category_id: item.category?.id || '',
      category_name: item.category?.name,
      country_id: item.country?.id || '',
      country_name: item.country?.name,
      country: item.country
        ? {
            id: item.country.id,
            name: item.country.name,
            code: (item.country as any).code,
          }
        : undefined,
      origin_country_id: item.origin_country?.id,
      origin_country_name: item.origin_country?.name,
      visa_type: item.visa_type,
      entry_type: item.entry_type,
      validity_days: item.validity_days,
      validity: item.validity_days
        ? isId
          ? `${item.validity_days} Hari`
          : `${item.validity_days} Days`
        : undefined,
      max_stay_days: item.max_stay_days,
      processing_time_days: firstPkgDays,
      processing_time: firstPkgDays
        ? isId
          ? `${firstPkgDays} Hari Kerja`
          : `${firstPkgDays} Business Days`
        : undefined,
      thumbnail: item.thumbnail,
      images: item.images || [],
      is_interview_required: item.is_interview_required,
      is_biometric_required: item.is_biometric_required,
      starting_price: Number(item.starting_price || 0),
      is_active: item.is_active,
      title: primaryTranslation?.title || 'Document & Visa Service',
      slug: primaryTranslation?.slug,
      description: primaryTranslation?.description,
      terms_conditions: primaryTranslation?.terms_conditions,
      submission_process: primaryTranslation?.submission_process,
      translations: (item.translations || []).map((t) => ({
        id: t.id,
        language_code: t.language_code,
        title: t.title,
        slug: t.slug,
        description: t.description,
        terms_conditions: t.terms_conditions,
        submission_process: t.submission_process,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      packages: (item.packages || []).map((p) => {
        const i18nName = this.formatI18nValue(p.name);
        const i18nDesc = p.description ? this.formatI18nValue(p.description) : undefined;
        return {
          id: p.id,
          name: lang ? this.resolveI18nValue(p.name, lang) : i18nName,
          name_i18n: typeof i18nName === 'object' ? i18nName : undefined,
          processing_time_days: p.processing_time_days,
          embassy_fee: Number(p.embassy_fee || 0),
          service_fee: Number(p.service_fee || 0),
          total_price: Number(p.total_price || 0),
          description: lang && p.description
            ? this.resolveI18nValue(p.description, lang)
            : (i18nDesc || undefined),
          description_i18n: typeof i18nDesc === 'object' ? i18nDesc : undefined,
          is_active: p.is_active,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
      requirements: (item.requirements || []).map((r) => {
        const i18nName = this.formatI18nValue(r.name);
        const i18nDesc = r.description ? this.formatI18nValue(r.description) : undefined;
        return {
          id: r.id,
          name: lang ? this.resolveI18nValue(r.name, lang) : i18nName,
          name_i18n: typeof i18nName === 'object' ? i18nName : undefined,
          description: lang && r.description
            ? this.resolveI18nValue(r.description, lang)
            : (i18nDesc || undefined),
          description_i18n: typeof i18nDesc === 'object' ? i18nDesc : undefined,
          allowed_file_types: r.allowed_file_types,
          max_file_size_mb: r.max_file_size_mb,
          is_mandatory: r.is_mandatory,
          example_file_url: r.example_file_url,
          order_priority: r.order_priority,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  // ─── 1. Create Document & Visa (Atomic Transaction, Single Batch) ───────────
  async create(dto: CreateDocumentVisaDto): Promise<DocumentVisaResponse> {
    // 1. Parallel Validation for Category and Countries
    const countryIds = [dto.country_id, dto.origin_country_id].filter(
      (id): id is string => !!id,
    );

    const [category, countries] = await Promise.all([
      this.categoryRepository.findOne({ where: { id: dto.category_id } }),
      countryIds.length > 0
        ? this.countryRepository.find({ where: { id: In(countryIds) } })
        : Promise.resolve([]),
    ]);

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${dto.category_id} not found`,
      );
    }

    const destCountry = countries.find((c) => c.id === dto.country_id);
    if (!destCountry) {
      throw new NotFoundException(
        `Destination Country with ID ${dto.country_id} not found`,
      );
    }

    const originCountry = dto.origin_country_id
      ? countries.find((c) => c.id === dto.origin_country_id)
      : undefined;

    // Check for duplicate document visa service
    const visaType = dto.visa_type || VisaType.TOURIST;
    const entryType = dto.entry_type || EntryType.SINGLE_ENTRY;

    const dupQb = this.documentVisaRepository
      .createQueryBuilder('visa')
      .where('visa.category_id = :categoryId', { categoryId: dto.category_id })
      .andWhere('visa.country_id = :countryId', { countryId: dto.country_id })
      .andWhere('visa.visa_type = :visaType', { visaType })
      .andWhere('visa.entry_type = :entryType', { entryType });

    if (dto.origin_country_id) {
      dupQb.andWhere('visa.origin_country_id = :originCountryId', {
        originCountryId: dto.origin_country_id,
      });
    } else {
      dupQb.andWhere('visa.origin_country_id IS NULL');
    }

    const existingDuplicate = await dupQb.getOne();
    if (existingDuplicate) {
      throw new ConflictException(
        `Document visa service for ${destCountry.name} (${visaType}, ${entryType}) already exists`,
      );
    }

    // 2. Calculate Starting Price if not specified
    let startingPrice = Number(dto.starting_price || 0);
    if (dto.packages && dto.packages.length > 0) {
      const packagePrices = dto.packages.map((p) => {
        const emb = Number(p.embassy_fee || 0);
        const srv = Number(p.service_fee || 0);
        return p.total_price !== undefined ? Number(p.total_price) : emb + srv;
      });
      const minPrice = Math.min(...packagePrices);
      if (startingPrice === 0 || minPrice < startingPrice) {
        startingPrice = minPrice;
      }
    }

    // 3. Atomic Database Transaction: Save Master + Translations + Packages + Requirements
    const savedVisa = await this.dataSource.transaction(async (manager) => {
      const visa = manager.create(DocumentVisa, {
        category,
        country: destCountry,
        origin_country: originCountry || undefined,
        visa_type: dto.visa_type || VisaType.TOURIST,
        entry_type: dto.entry_type || EntryType.SINGLE_ENTRY,
        validity_days: dto.validity_days,
        max_stay_days: dto.max_stay_days,
        thumbnail: dto.thumbnail,
        images: dto.images || [],
        is_interview_required: dto.is_interview_required ?? false,
        is_biometric_required: dto.is_biometric_required ?? false,
        starting_price: startingPrice,
        is_active: dto.is_active ?? true,
      });

      const createdVisa = await manager.save(DocumentVisa, visa);

      // Batch Save Translations
      if (dto.translations && dto.translations.length > 0) {
        const translationEntities = dto.translations.map((t) =>
          manager.create(DocumentVisaTranslation, {
            document_visa: { id: createdVisa.id } as any,
            language_code: t.language_code,
            title: t.title,
            slug: this.generateSlug(t.title),
            description: t.description,
            terms_conditions: t.terms_conditions,
            submission_process: t.submission_process,
          }),
        );
        await manager.save(DocumentVisaTranslation, translationEntities);
      }

      // Batch Save Packages
      if (dto.packages && dto.packages.length > 0) {
        const packageEntities = dto.packages.map((p) => {
          const emb = Number(p.embassy_fee || 0);
          const srv = Number(p.service_fee || 0);
          const total =
            p.total_price !== undefined ? Number(p.total_price) : emb + srv;

          return manager.create(DocumentVisaPackage, {
            document_visa: { id: createdVisa.id } as any,
            name: p.name,
            processing_time_days: p.processing_time_days || 1,
            embassy_fee: emb,
            service_fee: srv,
            total_price: total,
            description: p.description,
            is_active: p.is_active ?? true,
          });
        });
        await manager.save(DocumentVisaPackage, packageEntities);
      }

      // Batch Save Requirements
      if (dto.requirements && dto.requirements.length > 0) {
        const reqEntities = dto.requirements.map((r, idx) =>
          manager.create(DocumentVisaRequirement, {
            document_visa: { id: createdVisa.id } as any,
            name: r.name,
            description: r.description,
            allowed_file_types: r.allowed_file_types || 'pdf,jpg,jpeg,png',
            max_file_size_mb: r.max_file_size_mb || 5,
            is_mandatory: r.is_mandatory ?? true,
            example_file_url: r.example_file_url,
            order_priority: r.order_priority ?? idx,
          }),
        );
        await manager.save(DocumentVisaRequirement, reqEntities);
      }

      return createdVisa;
    });

    const result = await this.findById(savedVisa.id);
    return {
      message: 'Document visa created successfully',
      data: result.data,
    };
  }

  // ─── 2. Find All with Filters & Pagination (Single SQL Join, Zero N+1) ───────
  async findAll(query?: FilterDocumentVisaDto): Promise<DocumentVisaResponse> {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query?.limit || 10)));
    const skip = (page - 1) * limit;

    const qb = this.documentVisaRepository
      .createQueryBuilder('visa')
      .leftJoinAndSelect('visa.category', 'category')
      .leftJoinAndSelect('visa.country', 'country')
      .leftJoinAndSelect('visa.origin_country', 'origin_country')
      .leftJoinAndSelect('visa.translations', 'translations')
      .leftJoinAndSelect('visa.packages', 'packages')
      .leftJoinAndSelect('visa.requirements', 'requirements');

    // Filters
    if (query?.category_id) {
      qb.andWhere('category.id = :categoryId', {
        categoryId: query.category_id,
      });
    }

    if (query?.category_slug) {
      qb.andWhere('category.slug = :catSlug', {
        catSlug: query.category_slug,
      });
    }

    if (query?.country_id) {
      qb.andWhere('country.id = :countryId', { countryId: query.country_id });
    }

    if (query?.origin_country_id) {
      qb.andWhere('origin_country.id = :originCountryId', {
        originCountryId: query.origin_country_id,
      });
    }

    if (query?.visa_type) {
      qb.andWhere('visa.visa_type = :vType', { vType: query.visa_type });
    }

    if (query?.entry_type) {
      qb.andWhere('visa.entry_type = :eType', { eType: query.entry_type });
    }

    if (query?.search) {
      qb.andWhere(
        '(translations.title LIKE :search OR translations.description LIKE :search OR country.name LIKE :search OR category.name LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('visa.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      message: 'Document and visa list retrieved successfully',
      datas: items.map((it) => this.mapToResponseData(it, query?.lang)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── 3. Find by ID ──────────────────────────────────────────────────────────
  async findById(id: string, lang?: string): Promise<DocumentVisaResponse> {
    const item = await this.documentVisaRepository.findOne({
      where: { id },
      relations: [
        'category',
        'country',
        'origin_country',
        'translations',
        'packages',
        'requirements',
      ],
    });

    if (!item) {
      throw new NotFoundException(`Document visa with ID ${id} not found`);
    }

    return {
      message: 'Document visa retrieved successfully',
      data: this.mapToResponseData(item, lang),
    };
  }

  // ─── 4. Find by Slug ────────────────────────────────────────────────────────
  async findBySlug(slug: string, lang?: string): Promise<DocumentVisaResponse> {
    const translation = await this.translationRepository.findOne({
      where: { slug },
      relations: ['document_visa'],
    });

    if (!translation || !translation.document_visa) {
      throw new NotFoundException(
        `Document visa with slug "${slug}" not found`,
      );
    }

    return this.findById(translation.document_visa.id, lang);
  }

  // ─── 5. Update (Atomic Sync for Translations, Packages, Requirements) ───────
  async update(
    id: string,
    dto: UpdateDocumentVisaDto,
  ): Promise<DocumentVisaResponse> {
    const existing = await this.documentVisaRepository.findOne({
      where: { id },
      relations: [
        'category',
        'country',
        'origin_country',
        'translations',
        'packages',
        'requirements',
      ],
    });

    if (!existing) {
      throw new NotFoundException(`Document visa with ID ${id} not found`);
    }

    // Validate category / country updates if provided
    if (dto.category_id && dto.category_id !== existing.category?.id) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.category_id },
      });
      if (!category)
        throw new NotFoundException(
          `Category with ID ${dto.category_id} not found`,
        );
      existing.category = category;
    }

    if (dto.country_id && dto.country_id !== existing.country?.id) {
      const country = await this.countryRepository.findOne({
        where: { id: dto.country_id },
      });
      if (!country)
        throw new NotFoundException(
          `Country with ID ${dto.country_id} not found`,
        );
      existing.country = country;
    }

    if (dto.origin_country_id !== undefined) {
      if (dto.origin_country_id) {
        const originCountry = await this.countryRepository.findOne({
          where: { id: dto.origin_country_id },
        });
        if (!originCountry) {
          throw new NotFoundException(
            `Origin country with ID ${dto.origin_country_id} not found`,
          );
        }
        existing.origin_country = originCountry;
      } else {
        existing.origin_country = undefined;
      }
    }

    if (dto.visa_type) existing.visa_type = dto.visa_type;
    if (dto.entry_type) existing.entry_type = dto.entry_type;
    if (dto.validity_days !== undefined)
      existing.validity_days = dto.validity_days;
    if (dto.max_stay_days !== undefined)
      existing.max_stay_days = dto.max_stay_days;
    if (dto.thumbnail !== undefined) existing.thumbnail = dto.thumbnail;
    if (dto.images !== undefined) existing.images = dto.images;
    if (dto.is_interview_required !== undefined)
      existing.is_interview_required = dto.is_interview_required;
    if (dto.is_biometric_required !== undefined)
      existing.is_biometric_required = dto.is_biometric_required;
    if (dto.is_active !== undefined) existing.is_active = dto.is_active;

    // Check for duplicate document visa service on update
    const targetCategoryId = existing.category?.id;
    const targetCountryId = existing.country?.id;
    const targetOriginCountryId = existing.origin_country?.id;
    const targetVisaType = existing.visa_type;
    const targetEntryType = existing.entry_type;

    const dupQb = this.documentVisaRepository
      .createQueryBuilder('visa')
      .where('visa.id != :id', { id: existing.id })
      .andWhere('visa.category_id = :categoryId', {
        categoryId: targetCategoryId,
      })
      .andWhere('visa.country_id = :countryId', { countryId: targetCountryId })
      .andWhere('visa.visa_type = :visaType', { visaType: targetVisaType })
      .andWhere('visa.entry_type = :entryType', {
        entryType: targetEntryType,
      });

    if (targetOriginCountryId) {
      dupQb.andWhere('visa.origin_country_id = :originCountryId', {
        originCountryId: targetOriginCountryId,
      });
    } else {
      dupQb.andWhere('visa.origin_country_id IS NULL');
    }

    const duplicateOther = await dupQb.getOne();
    if (duplicateOther) {
      throw new ConflictException(
        `Another document visa service for destination (${existing.country?.name || targetCountryId}), origin country, visa type (${targetVisaType}), and entry type (${targetEntryType}) already exists`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // Sync Translations
      if (dto.translations && dto.translations.length > 0) {
        const finalTranslations: DocumentVisaTranslation[] = [];
        for (const tDto of dto.translations) {
          let trans = existing.translations?.find(
            (t) => t.language_code === tDto.language_code,
          );
          if (trans) {
            trans.title = tDto.title;
            trans.description = tDto.description;
            if (tDto.terms_conditions !== undefined)
              trans.terms_conditions = tDto.terms_conditions;
            if (tDto.submission_process !== undefined)
              trans.submission_process = tDto.submission_process;
          } else {
            trans = manager.create(DocumentVisaTranslation, {
              document_visa: { id: existing.id } as any,
              language_code: tDto.language_code,
              title: tDto.title,
              slug: this.generateSlug(tDto.title),
              description: tDto.description,
              terms_conditions: tDto.terms_conditions,
              submission_process: tDto.submission_process,
            });
          }
          finalTranslations.push(trans);
        }
        await manager.save(DocumentVisaTranslation, finalTranslations);
        existing.translations = finalTranslations;
      }

      // Sync Packages
      if (dto.packages) {
        const pkgIdsToKeep = dto.packages
          .map((p) => p.id)
          .filter((id): id is string => !!id);

        if (existing.packages && existing.packages.length > 0) {
          const pkgsToRemove = existing.packages.filter(
            (p) => !pkgIdsToKeep.includes(p.id),
          );
          if (pkgsToRemove.length > 0) {
            await manager.softRemove(DocumentVisaPackage, pkgsToRemove);
          }
        }

        const finalPackages: DocumentVisaPackage[] = [];
        for (const pDto of dto.packages) {
          const emb = Number(pDto.embassy_fee || 0);
          const srv = Number(pDto.service_fee || 0);
          const total =
            pDto.total_price !== undefined
              ? Number(pDto.total_price)
              : emb + srv;

          let pkg = pDto.id
            ? existing.packages?.find((p) => p.id === pDto.id)
            : null;

          if (pkg) {
            pkg.name = pDto.name;
            if (pDto.processing_time_days !== undefined)
              pkg.processing_time_days = pDto.processing_time_days;
            pkg.embassy_fee = emb;
            pkg.service_fee = srv;
            pkg.total_price = total;
            if (pDto.description !== undefined)
              pkg.description = pDto.description;
            if (pDto.is_active !== undefined) pkg.is_active = pDto.is_active;
          } else {
            pkg = manager.create(DocumentVisaPackage, {
              document_visa: { id: existing.id } as any,
              name: pDto.name,
              processing_time_days: pDto.processing_time_days || 1,
              embassy_fee: emb,
              service_fee: srv,
              total_price: total,
              description: pDto.description,
              is_active: pDto.is_active ?? true,
            });
          }
          finalPackages.push(pkg);
        }

        await manager.save(DocumentVisaPackage, finalPackages);
        existing.packages = finalPackages;

        // Auto update starting price
        const activePrices = finalPackages
          .filter((p) => p.is_active)
          .map((p) => Number(p.total_price));
        if (activePrices.length > 0) {
          existing.starting_price = Math.min(...activePrices);
        }
      }

      // Sync Requirements
      if (dto.requirements) {
        const reqIdsToKeep = dto.requirements
          .map((r) => r.id)
          .filter((id): id is string => !!id);

        if (existing.requirements && existing.requirements.length > 0) {
          const reqsToRemove = existing.requirements.filter(
            (r) => !reqIdsToKeep.includes(r.id),
          );
          if (reqsToRemove.length > 0) {
            await manager.softRemove(DocumentVisaRequirement, reqsToRemove);
          }
        }

        const finalReqs: DocumentVisaRequirement[] = [];
        for (const [idx, rDto] of dto.requirements.entries()) {
          let req = rDto.id
            ? existing.requirements?.find((r) => r.id === rDto.id)
            : null;

          if (req) {
            req.name = rDto.name;
            if (rDto.description !== undefined)
              req.description = rDto.description;
            if (rDto.allowed_file_types !== undefined)
              req.allowed_file_types = rDto.allowed_file_types;
            if (rDto.max_file_size_mb !== undefined)
              req.max_file_size_mb = rDto.max_file_size_mb;
            if (rDto.is_mandatory !== undefined)
              req.is_mandatory = rDto.is_mandatory;
            if (rDto.example_file_url !== undefined)
              req.example_file_url = rDto.example_file_url;
            if (rDto.order_priority !== undefined)
              req.order_priority = rDto.order_priority;
          } else {
            req = manager.create(DocumentVisaRequirement, {
              document_visa: { id: existing.id } as any,
              name: rDto.name,
              description: rDto.description,
              allowed_file_types: rDto.allowed_file_types || 'pdf,jpg,jpeg,png',
              max_file_size_mb: rDto.max_file_size_mb || 5,
              is_mandatory: rDto.is_mandatory ?? true,
              example_file_url: rDto.example_file_url,
              order_priority: rDto.order_priority ?? idx,
            });
          }
          finalReqs.push(req);
        }

        await manager.save(DocumentVisaRequirement, finalReqs);
        existing.requirements = finalReqs;
      }

      if (dto.starting_price !== undefined) {
        existing.starting_price = dto.starting_price;
      }

      await manager.save(DocumentVisa, existing);
    });

    const result = await this.findById(id);
    return {
      message: 'Document visa updated successfully',
      data: result.data,
    };
  }

  // ─── 6. Soft Delete ─────────────────────────────────────────────────────────
  async delete(id: string): Promise<DocumentVisaResponse> {
    const existing = await this.documentVisaRepository.findOne({
      where: { id },
      relations: ['translations', 'packages', 'requirements'],
    });

    if (!existing) {
      throw new NotFoundException(`Document visa with ID ${id} not found`);
    }

    await this.documentVisaRepository.softRemove(existing);

    return {
      message: 'Document visa deleted successfully',
    };
  }

  // ─── 7. Categories Master Data ──────────────────────────────────────────────
  async findCategories(): Promise<{
    message: string;
    datas: DocumentCategoryResponse[];
  }> {
    const categories = await this.categoryRepository.find({
      where: { is_active: true },
      order: { order_priority: 'ASC', name: 'ASC' },
    });

    return {
      message: 'Document categories retrieved successfully',
      datas: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        order_priority: c.order_priority,
        is_active: c.is_active,
      })),
    };
  }
}
