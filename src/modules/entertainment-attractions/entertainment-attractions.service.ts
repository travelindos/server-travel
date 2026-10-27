import { HttpException, HttpStatus, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CategoryEntertainment } from './entities/category-entertainment.entity';
import { Country } from '../locations/entities/country.entity';
import { State } from '../locations/entities/state.entity';
import {
  CreateEntertainmentAttractionDto,
  UpdateEntertainmentAttractionDto,
} from './dto/create-entertainment-attraction.dto';
import { FilterEntertainmentAttractionDto } from './dto/filter-entertainment-attraction.dto';
import {
  EntertainmentAttractionTranslation,
  Language,
} from './entities/entertainment-attraction-translation.entity';
import {
  EntertainmentAttractionTicket,
  TicketType,
} from './entities/entertainment-attraction-ticket.entity';
import { EntertainmentAttraction } from './entities/entertainment-attraction.entity';

@Injectable()
export class EntertainmentAttractionsService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EntertainmentAttraction)
    private readonly attractionRepository: Repository<EntertainmentAttraction>,
    @InjectRepository(EntertainmentAttractionTicket)
    private readonly ticketRepository: Repository<EntertainmentAttractionTicket>,
    @InjectRepository(EntertainmentAttractionTranslation)
    private readonly translationRepository: Repository<EntertainmentAttractionTranslation>,
    @InjectRepository(CategoryEntertainment)
    private readonly categoryRepository: Repository<CategoryEntertainment>,
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    @InjectRepository(State)
    private readonly stateRepository: Repository<State>,
  ) {}

  async onModuleInit() {
    await this.seedInitialCategoriesAndAttractions();
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ─── Seed Helper ─────────────────────────────────────────────────────
  private async seedInitialCategoriesAndAttractions() {
    try {
      // 1. Seed entertainment categories if none exist
      const existingCategories = await this.categoryRepository.find();
      if (existingCategories.length === 0) {
        await this.categoryRepository.save([
          this.categoryRepository.create({ name: 'Theme & Waterpark' }),
          this.categoryRepository.create({ name: 'Zoo & Safari' }),
          this.categoryRepository.create({ name: 'Show & Cultural Event' }),
          this.categoryRepository.create({ name: 'Museum & Art Gallery' }),
          this.categoryRepository.create({ name: 'Extreme & Adventure' }),
        ]);
      }

      // 2. Seed mock attractions if table is empty
      const count = await this.attractionRepository.count();
      if (count === 0) {
        const categories = await this.categoryRepository.find();
        const waterparkCat =
          categories.find((c) => c.name.includes('Theme')) || categories[0];
        const safariCat =
          categories.find((c) => c.name.includes('Zoo')) || categories[1];
        const cultureCat =
          categories.find((c) => c.name.includes('Show')) || categories[2];

        const states = await this.stateRepository.find({ relations: ['country'] });
        const fallbackState = states[0];
        const fallbackCountry = fallbackState?.country || (await this.countryRepository.find())[0];

        if (fallbackState && fallbackCountry && waterparkCat) {
          const attr1 = this.attractionRepository.create({
            category_entertainment: { id: waterparkCat.id },
            country: { id: fallbackCountry.id },
            state: { id: fallbackState.id },
            price: 25.0,
            thumbnail:
              'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80',
            images: [
              'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80',
            ],
          });
          const saved1 = await this.attractionRepository.save(attr1);
          await this.translationRepository.save([
            this.translationRepository.create({
              attraction: { id: saved1.id },
              name: 'Waterbom Bali Day Pass',
              slug: this.generateSlug('Waterbom Bali Day Pass'),
              description:
                "Asia's #1 Waterpark with world-class water slides, lazy rivers, and tropical lush gardens.",
              language_code: Language.EN,
            }),
            this.translationRepository.create({
              attraction: { id: saved1.id },
              name: 'Tiket Masuk Seharian Waterbom Bali',
              slug: this.generateSlug('Tiket Masuk Seharian Waterbom Bali'),
              description:
                'Waterpark nomor 1 di Asia dengan wahana seluncur air kelas dunia dan taman tropis yang asri.',
              language_code: Language.ID,
            }),
          ]);

          // Seed tickets for Waterbom (Package with Adult & Child)
          await this.ticketRepository.save([
            this.ticketRepository.create({
              attraction: { id: saved1.id },
              name: 'Dewasa (Adult Pass)',
              ticket_type: TicketType.PACKAGE,
              price: 35.0,
              pax_count: 1,
              description: 'Usia 12+ tahun',
            }),
            this.ticketRepository.create({
              attraction: { id: saved1.id },
              name: 'Anak-Anak (Child Pass)',
              ticket_type: TicketType.PACKAGE,
              price: 25.0,
              pax_count: 1,
              description: 'Usia 2 - 11 tahun',
            }),
          ]);

          if (safariCat) {
            const attr2 = this.attractionRepository.create({
              category_entertainment: { id: safariCat.id },
              country: { id: fallbackCountry.id },
              state: { id: fallbackState.id },
              price: 35.0,
              thumbnail:
                'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800&q=80',
              images: [
                'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800&q=80',
              ],
            });
            const saved2 = await this.attractionRepository.save(attr2);
            await this.translationRepository.save([
              this.translationRepository.create({
                attraction: { id: saved2.id },
                name: 'Bali Safari & Marine Park - Jungle Hopper',
                slug: this.generateSlug('Bali Safari & Marine Park - Jungle Hopper'),
                description:
                  'Encounter hundreds of exotic animals from around the world in their natural habitat with live cultural shows.',
                language_code: Language.EN,
              }),
            ]);

            await this.ticketRepository.save([
              this.ticketRepository.create({
                attraction: { id: saved2.id },
                name: 'Dewasa (Adult Pass)',
                ticket_type: TicketType.PACKAGE,
                price: 49.0,
                pax_count: 1,
                description: 'Usia 12+ tahun',
              }),
              this.ticketRepository.create({
                attraction: { id: saved2.id },
                name: 'Anak-Anak (Child Pass)',
                ticket_type: TicketType.PACKAGE,
                price: 35.0,
                pax_count: 1,
                description: 'Usia 3 - 11 tahun',
              }),
            ]);
          }

          if (cultureCat) {
            const attr3 = this.attractionRepository.create({
              category_entertainment: { id: cultureCat.id },
              country: { id: fallbackCountry.id },
              state: { id: fallbackState.id },
              price: 25.0,
              thumbnail:
                'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
              images: [
                'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
              ],
            });
            const saved3 = await this.attractionRepository.save(attr3);
            await this.translationRepository.save([
              this.translationRepository.create({
                attraction: { id: saved3.id },
                name: 'Uluwatu Temple Sunset & Kecak Fire Dance',
                slug: this.generateSlug('Uluwatu Temple Sunset & Kecak Fire Dance'),
                description:
                  'Witness the iconic cliffside sunset paired with the world-renowned traditional Balinese Kecak fire dance performance.',
                language_code: Language.EN,
              }),
            ]);

            // Flat ticket example
            await this.ticketRepository.save([
              this.ticketRepository.create({
                attraction: { id: saved3.id },
                name: 'General Admission (All Ages)',
                ticket_type: TicketType.FLAT,
                price: 25.0,
                pax_count: 1,
                description: 'Berlaku untuk semua usia',
              }),
            ]);
          }
        }
      }

      // Auto-repair any existing attractions with the broken Unsplash URL in database
      const existingAttractions = await this.attractionRepository.find();
      for (const attr of existingAttractions) {
        if (attr.thumbnail && attr.thumbnail.includes('photo-1582650625119-3a31f8418b7d')) {
          attr.thumbnail = 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80';
          await this.attractionRepository.save(attr);
        }
      }
    } catch (e) {
      // Ignore seed errors on start
    }
  }

  // ─── Create Attraction (Optimized: Parallel minimal lookup + Atomic Transaction + Zero extra SELECT) ───
  async create(reqDto: CreateEntertainmentAttractionDto) {
    // 1. Parallel minimal column projection to avoid full table scans / unused joins
    const [findCategory, findCountry, findState] = await Promise.all([
      this.categoryRepository.findOne({
        where: { id: reqDto.category_destination_id },
        select: ['id', 'name'],
      }),
      reqDto.country_id
        ? this.countryRepository.findOne({
            where: { id: reqDto.country_id },
            select: ['id', 'name'],
          })
        : null,
      this.stateRepository.findOne({
        where: { id: reqDto.state_id },
        relations: ['country'],
      }),
    ]);

    if (!findCategory) {
      throw new HttpException('Attraction Category not found', HttpStatus.BAD_REQUEST);
    }
    if (!findState) {
      throw new HttpException('State/Location not found', HttpStatus.BAD_REQUEST);
    }
    const resolvedCountry = findCountry || findState.country;
    if (!resolvedCountry) {
      throw new HttpException('Country not found', HttpStatus.BAD_REQUEST);
    }

    // Determine starting price from tickets or fallback to price field
    let startingPrice = reqDto.price || 0;
    if (reqDto.tickets && reqDto.tickets.length > 0) {
      const ticketPrices = reqDto.tickets.map((t) => Number(t.price)).filter((p) => !isNaN(p));
      if (ticketPrices.length > 0) {
        startingPrice = Math.min(...ticketPrices);
      }
    }

    // 2. Atomic Database Transaction: ensures all writes (attraction, translations, tickets) happen together
    const createdAttraction = await this.dataSource.transaction(async (manager) => {
      // Create and save Attraction
      const attraction = manager.create(EntertainmentAttraction, {
        category_entertainment: findCategory,
        country: resolvedCountry,
        state: findState,
        price: startingPrice,
        thumbnail: reqDto.thumbnail,
        images: Array.isArray(reqDto.images) ? reqDto.images : [],
        daily_quota: reqDto.daily_quota !== undefined ? reqDto.daily_quota : null,
      });
      const savedAttraction = await manager.save(EntertainmentAttraction, attraction);

      // Batch save Translations
      let savedTranslations: EntertainmentAttractionTranslation[] = [];
      if (reqDto.translations && reqDto.translations.length > 0) {
        const translationEntities = reqDto.translations.map((t) =>
          manager.create(EntertainmentAttractionTranslation, {
            attraction: { id: savedAttraction.id } as any,
            name: t.name,
            slug: this.generateSlug(t.name),
            description: t.description,
            language_code: t.language_code,
          }),
        );
        savedTranslations = await manager.save(EntertainmentAttractionTranslation, translationEntities);
      }

      // Batch save Tickets
      let savedTickets: EntertainmentAttractionTicket[] = [];
      if (reqDto.tickets && reqDto.tickets.length > 0) {
        const ticketEntities = reqDto.tickets.map((t) =>
          manager.create(EntertainmentAttractionTicket, {
            attraction: { id: savedAttraction.id } as any,
            name: t.name,
            ticket_type: t.ticket_type,
            price: Number(t.price),
            pax_count: t.pax_count || 1,
            min_age: t.min_age !== undefined ? t.min_age : null,
            max_age: t.max_age !== undefined ? t.max_age : null,
            description: t.description,
          }),
        );
        savedTickets = await manager.save(EntertainmentAttractionTicket, ticketEntities);
      } else if (startingPrice > 0) {
        const defaultTicket = manager.create(EntertainmentAttractionTicket, {
          attraction: { id: savedAttraction.id } as any,
          name: 'General Admission',
          ticket_type: TicketType.FLAT,
          price: startingPrice,
          pax_count: 1,
          description: 'Standard admission ticket',
        });
        savedTickets = [await manager.save(EntertainmentAttractionTicket, defaultTicket)];
      }

      // Reassemble in-memory entity graph to eliminate any extra SELECT round-trip query
      savedAttraction.category_entertainment = findCategory;
      savedAttraction.country = resolvedCountry;
      savedAttraction.state = findState;
      savedAttraction.translations = savedTranslations;
      savedAttraction.tickets = savedTickets;

      return savedAttraction;
    });

    return {
      message: 'Attraction created successfully',
      data: this.mapToResponseData(createdAttraction),
    };
  }

  // ─── Find All Attractions with Translations & Tickets ────────────────
  async findAllWithTranslation(filterDto: FilterEntertainmentAttractionDto = {}) {
    const page = Math.max(1, Number(filterDto.page || 1));
    const limit = Math.max(1, Math.min(100, Number(filterDto.limit || 10)));
    const skip = (page - 1) * limit;

    const queryBuilder = this.attractionRepository
      .createQueryBuilder('attraction')
      .leftJoinAndSelect('attraction.category_entertainment', 'category_entertainment')
      .leftJoinAndSelect('attraction.country', 'country')
      .leftJoinAndSelect('attraction.state', 'state')
      .leftJoinAndSelect('attraction.translations', 'translations')
      .leftJoinAndSelect('attraction.tickets', 'tickets');

    if (filterDto.search) {
      queryBuilder.andWhere('translations.name LIKE :search', {
        search: `%${filterDto.search}%`,
      });
    }

    const catId = filterDto.category_id || filterDto.category_destination_id;
    if (catId) {
      queryBuilder.andWhere('category_entertainment.id = :catId', {
        catId,
      });
    }

    if (filterDto.country_id) {
      queryBuilder.andWhere('country.id = :countryId', {
        countryId: filterDto.country_id,
      });
    }

    if (filterDto.state_id) {
      queryBuilder.andWhere('state.id = :stateId', {
        stateId: filterDto.state_id,
      });
    }

    const [items, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('attraction.createdAt', 'DESC')
      .getManyAndCount();

    const datas = items.map((item) => this.mapToResponseData(item));

    return {
      message: 'Entertainment Attractions retrieved successfully',
      datas,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  // ─── Find Categories ─────────────────────────────────────────────────
  async findCategories() {
    const categories = await this.categoryRepository.find({
      order: { name: 'ASC' },
    });
    return {
      message: 'Attraction categories retrieved successfully',
      datas: categories,
    };
  }

  // ─── Find By Slug ────────────────────────────────────────────────────
  async findBySlug(slug: string) {
    const translation = await this.translationRepository.findOne({
      where: { slug },
      relations: [
        'attraction',
        'attraction.category_entertainment',
        'attraction.country',
        'attraction.state',
        'attraction.translations',
        'attraction.tickets',
      ],
    });

    if (!translation || !translation.attraction) {
      throw new HttpException('Attraction not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Attraction details retrieved successfully',
      data: this.mapToResponseData(translation.attraction),
    };
  }

  // ─── Find By ID ──────────────────────────────────────────────────────
  async findById(id: string) {
    const attraction = await this.attractionRepository.findOne({
      where: { id },
      relations: [
        'category_entertainment',
        'country',
        'state',
        'translations',
        'tickets',
      ],
    });

    if (!attraction) {
      throw new HttpException('Attraction not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Attraction details retrieved successfully',
      data: this.mapToResponseData(attraction),
    };
  }

  // ─── Update Attraction ───────────────────────────────────────────────
  async update(id: string, reqDto: UpdateEntertainmentAttractionDto) {
    const attraction = await this.attractionRepository.findOne({
      where: { id },
      relations: ['translations', 'category_entertainment', 'country', 'state', 'tickets'],
    });

    if (!attraction) {
      throw new HttpException('Attraction not found', HttpStatus.NOT_FOUND);
    }

    if (reqDto.category_destination_id) {
      const findCategory = await this.categoryRepository.findOne({
        where: { id: reqDto.category_destination_id },
        select: ['id', 'name'],
      });
      if (findCategory) attraction.category_entertainment = findCategory;
    }

    if (reqDto.country_id) {
      const findCountry = await this.countryRepository.findOne({
        where: { id: reqDto.country_id },
        select: ['id', 'name'],
      });
      if (findCountry) attraction.country = findCountry;
    }

    if (reqDto.state_id) {
      const findState = await this.stateRepository.findOne({
        where: { id: reqDto.state_id },
        relations: ['country'],
      });
      if (findState) {
        attraction.state = findState;
        if (!reqDto.country_id && findState.country) {
          attraction.country = findState.country;
        }
      }
    }

    if (reqDto.thumbnail !== undefined) attraction.thumbnail = reqDto.thumbnail;
    if (reqDto.images !== undefined) attraction.images = reqDto.images;
    if (reqDto.daily_quota !== undefined) attraction.daily_quota = reqDto.daily_quota;

    await this.dataSource.transaction(async (manager) => {
      // 1. Handle Tickets update / sync
      if (reqDto.tickets && reqDto.tickets.length > 0) {
        const ticketPrices = reqDto.tickets.map((t) => Number(t.price)).filter((p) => !isNaN(p));
        if (ticketPrices.length > 0) {
          attraction.price = Math.min(...ticketPrices);
        }

        const existingTickets = attraction.tickets || [];
        const finalTickets: EntertainmentAttractionTicket[] = [];

        for (const tDto of reqDto.tickets) {
          // Match by id first, or fallback to matching by trimmed name
          const existing = existingTickets.find((t) => {
            if (tDto.id && t.id === tDto.id) return true;
            return t.name.trim().toLowerCase() === tDto.name.trim().toLowerCase();
          });

          if (existing) {
            existing.name = tDto.name;
            existing.ticket_type = tDto.ticket_type;
            existing.price = Number(tDto.price);
            if (tDto.pax_count !== undefined) existing.pax_count = tDto.pax_count;
            existing.min_age = tDto.min_age !== undefined ? tDto.min_age : null;
            existing.max_age = tDto.max_age !== undefined ? tDto.max_age : null;
            if (tDto.description !== undefined) existing.description = tDto.description;
            const savedExisting = await manager.save(EntertainmentAttractionTicket, existing);
            finalTickets.push(savedExisting);
          } else {
            const newTicket = manager.create(EntertainmentAttractionTicket, {
              attraction: { id: attraction.id } as any,
              name: tDto.name,
              ticket_type: tDto.ticket_type,
              price: Number(tDto.price),
              pax_count: tDto.pax_count || 1,
              min_age: tDto.min_age !== undefined ? tDto.min_age : null,
              max_age: tDto.max_age !== undefined ? tDto.max_age : null,
              description: tDto.description,
            });
            const savedNew = await manager.save(EntertainmentAttractionTicket, newTicket);
            finalTickets.push(savedNew);
          }
        }

        // Remove any obsolete tickets that were deleted in the update form
        const retainedTicketIds = new Set(finalTickets.map((t) => t.id).filter(Boolean));
        const ticketsToDelete = existingTickets.filter((t) => !retainedTicketIds.has(t.id));
        if (ticketsToDelete.length > 0) {
          await manager.remove(EntertainmentAttractionTicket, ticketsToDelete);
        }

        attraction.tickets = finalTickets;
      } else if (reqDto.price !== undefined) {
        attraction.price = reqDto.price;
      }

      // 2. Handle Translations update / sync
      if (reqDto.translations && reqDto.translations.length > 0) {
        const existingTranslations = attraction.translations || [];
        const finalTranslations: EntertainmentAttractionTranslation[] = [];

        for (const tDto of reqDto.translations) {
          const existing = existingTranslations.find(
            (t) => t.language_code === tDto.language_code,
          );

          if (existing) {
            existing.name = tDto.name;
            existing.slug = this.generateSlug(tDto.name);
            existing.description = tDto.description;
            const savedExisting = await manager.save(EntertainmentAttractionTranslation, existing);
            finalTranslations.push(savedExisting);
          } else {
            const newTranslation = manager.create(EntertainmentAttractionTranslation, {
              attraction: { id: attraction.id } as any,
              name: tDto.name,
              slug: this.generateSlug(tDto.name),
              description: tDto.description,
              language_code: tDto.language_code,
            });
            const savedNew = await manager.save(EntertainmentAttractionTranslation, newTranslation);
            finalTranslations.push(savedNew);
          }
        }

        // Remove any obsolete translations that were removed
        const retainedTransIds = new Set(finalTranslations.map((t) => t.id).filter(Boolean));
        const transToDelete = existingTranslations.filter((t) => !retainedTransIds.has(t.id));
        if (transToDelete.length > 0) {
          await manager.remove(EntertainmentAttractionTranslation, transToDelete);
        }

        attraction.translations = finalTranslations;
      }

      // 3. Save parent attraction entity
      await manager.save(EntertainmentAttraction, attraction);
    });

    const updated = await this.findById(id);
    return {
      message: 'Attraction updated successfully',
      data: updated.data,
    };
  }

  // ─── Delete Attraction (Soft Delete) ─────────────────────────────────
  async delete(id: string) {
    const attraction = await this.attractionRepository.findOne({
      where: { id },
      relations: ['translations', 'tickets'],
    });
    if (!attraction) {
      throw new NotFoundException('Attraction not found');
    }
    await this.attractionRepository.softRemove(attraction);
    return {
      message: 'Attraction deleted successfully',
    };
  }

  // ─── Map Helper ──────────────────────────────────────────────────────
  private mapToResponseData(item: EntertainmentAttraction) {
    const countryName = item.country?.name || item.state?.country?.name || '';
    const stateName = item.state?.name || '';

    const location = stateName && countryName
      ? `${stateName}, ${countryName}`
      : stateName || countryName || 'Indonesia';

    const enTrans = item.translations?.find((t) => t.language_code === Language.EN);
    const primaryName = enTrans?.name || item.translations?.[0]?.name || 'Unnamed Attraction';

    const safeThumbnail =
      item.thumbnail && item.thumbnail.includes('photo-1582650625119-3a31f8418b7d')
        ? 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80'
        : item.thumbnail || (item.images && item.images[0]) || '';

    return {
      id: item.id,
      country_id: item.country?.id || item.state?.country?.id || '',
      country_name: countryName,
      state_id: item.state?.id || '',
      state_name: stateName,
      location,
      category_destination_id: item.category_entertainment?.id || '',
      category_destination_name: item.category_entertainment?.name || 'Attraction',
      category_id: item.category_entertainment?.id || '',
      category_name: item.category_entertainment?.name || 'Attraction',
      category: item.category_entertainment?.name || 'Attraction',
      name: primaryName,
      price: Number(item.price), // Starting from price
      daily_quota: item.daily_quota !== undefined && item.daily_quota !== null ? Number(item.daily_quota) : null,
      thumbnail: safeThumbnail,
      images: (item.images || []).map((img) =>
        img.includes('photo-1582650625119-3a31f8418b7d')
          ? 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&q=80'
          : img,
      ),
      tickets: (item.tickets || []).map((t) => ({
        id: t.id,
        name: t.name,
        ticket_type: t.ticket_type,
        price: Number(t.price),
        pax_count: t.pax_count,
        min_age: t.min_age !== undefined ? t.min_age : null,
        max_age: t.max_age !== undefined ? t.max_age : null,
        description: t.description,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      translations: (item.translations || []).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        language_code: t.language_code,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
