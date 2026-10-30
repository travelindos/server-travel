import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ResponseDestination,
} from '../../types/response/destination.type';
import { Repository } from 'typeorm';
import { State } from '../locations/entities/state.entity';
import { City } from '../locations/entities/city.entity';
import {
  CreateDestinationDto,
  UpdateDestinationDto,
} from './dto/create-destination.dto';
import { FilterDestinationDto } from './dto/filter-destination.dto';
import { CategoryDestination } from './entities/category_destination.entity';
import { DestinationTranslation } from './entities/destination-translation.entity';
import { Destination } from './entities/destination.entity';

@Injectable()
export class DestinationService {
  constructor(
    @InjectRepository(Destination)
    private readonly destinationRepository: Repository<Destination>,
    @InjectRepository(DestinationTranslation)
    private readonly destinationTranslationRepository: Repository<DestinationTranslation>,
    @InjectRepository(CategoryDestination)
    private readonly categoryDestinationRepository: Repository<CategoryDestination>,
    @InjectRepository(State)
    private readonly stateRepository: Repository<State>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ─── Create Destination (Zero N+1 Query & Parallel Validation) ─────────────
  async create(reqDto: CreateDestinationDto): Promise<ResponseDestination> {
    const [findCategoryDestination, findState, findCity] = await Promise.all([
      this.categoryDestinationRepository.findOne({
        where: { id: reqDto.category_destination_id },
      }),
      this.stateRepository.findOne({
        where: { id: reqDto.state_id },
        relations: ['country'],
      }),
      reqDto.city_id
        ? this.cityRepository.findOne({ where: { id: reqDto.city_id } })
        : Promise.resolve(null),
    ]);

    if (!findCategoryDestination) {
      throw new HttpException('Category destination not found', HttpStatus.BAD_REQUEST);
    }
    if (!findState) {
      throw new HttpException('State not found', HttpStatus.BAD_REQUEST);
    }
    if (reqDto.city_id && !findCity) {
      throw new HttpException('City not found', HttpStatus.BAD_REQUEST);
    }

    const destination = this.destinationRepository.create({
      category_destination: { id: findCategoryDestination.id },
      state: { id: findState.id },
      city: findCity ? { id: findCity.id } : undefined,
      price: reqDto.price,
      thumbnail: reqDto.thumbnail,
      images: Array.isArray(reqDto.images) ? reqDto.images : [],
    });

    await this.destinationRepository.save(destination);

    let savedTranslations = [];
    if (Array.isArray(reqDto.translations) && reqDto.translations.length > 0) {
      const translationsToCreate = reqDto.translations.map((transDto) =>
        this.destinationTranslationRepository.create({
          destination: { id: destination.id },
          language_code: transDto.language_code,
          name: transDto.name,
          slug: this.generateSlug(transDto.name),
          description: transDto.description,
          detail_tour: Array.isArray(transDto.detail_tour) ? transDto.detail_tour : [],
          facilities: Array.isArray(transDto.facilities) ? transDto.facilities : [],
        }),
      );

      const savedEntities = await this.destinationTranslationRepository.save(
        translationsToCreate,
      );

      savedTranslations = savedEntities.map((savedTrans) => ({
        id: savedTrans.id,
        destination_id: destination.id,
        language_code: savedTrans.language_code,
        name: savedTrans.name,
        slug: savedTrans.slug,
        description: savedTrans.description,
        detail_tour: savedTrans.detail_tour,
        facilities: savedTrans.facilities,
        createdAt: savedTrans.createdAt,
        updatedAt: savedTrans.updatedAt,
      }));
    }

    const name = reqDto.translations?.[0]?.name;
    const message = name
      ? `Destination ${name} created successfully`
      : `Destination with ID ${destination.id} created successfully`;

    return {
      message,
      data: {
        id: destination.id,
        category_destination_id: destination.category_destination.id,
        category_destination_name: findCategoryDestination.name,
        state_id: destination.state.id,
        city_id: findCity ? findCity.id : undefined,
        city_name: findCity ? findCity.name : undefined,
        location: findCity
          ? `${findCity.name}, ${findState.country ? findState.country.name : ''}`
          : `${findState.name}, ${findState.country ? findState.country.name : ''}`,
        country_id: findState.country ? findState.country.id : undefined,
        country_name: findState.country ? findState.country.name : undefined,
        price: destination.price,
        thumbnail: destination.thumbnail,
        images: destination.images,
        translations: savedTranslations,
      },
    };
  }

  // ─── Find All Destinations with Translation (QueryBuilder + Zero N+1) ───────
  async findAllDestinationWithTranslation(
    filterDto: FilterDestinationDto = {},
  ): Promise<ResponseDestination> {
    const page = Math.max(1, Number(filterDto.page || 1));
    const hasLimit =
      filterDto.limit !== undefined &&
      filterDto.limit !== null &&
      (filterDto.limit as any) !== '';
    const limit = hasLimit
      ? Math.max(1, Math.min(1000, Number(filterDto.limit)))
      : 100;
    const skip = (page - 1) * limit;

    const queryBuilder = this.destinationRepository
      .createQueryBuilder('destination')
      .leftJoinAndSelect('destination.category_destination', 'category_destination')
      .leftJoinAndSelect('destination.state', 'state')
      .leftJoinAndSelect('state.country', 'country')
      .leftJoinAndSelect('destination.city', 'city')
      .leftJoinAndSelect('destination.translations', 'translations');

    if (filterDto.category_destination_id) {
      queryBuilder.andWhere('category_destination.id = :categoryId', {
        categoryId: filterDto.category_destination_id,
      });
    }

    if (filterDto.state_id) {
      queryBuilder.andWhere('state.id = :stateId', {
        stateId: filterDto.state_id,
      });
    }

    if (filterDto.city_id) {
      queryBuilder.andWhere('city.id = :cityId', {
        cityId: filterDto.city_id,
      });
    }

    if (filterDto.search) {
      queryBuilder.andWhere(
        '(translations.name LIKE :search OR translations.slug LIKE :search OR state.name LIKE :search OR city.name LIKE :search OR country.name LIKE :search)',
        { search: `%${filterDto.search}%` },
      );
    }

    queryBuilder.skip(skip).take(limit).orderBy('destination.createdAt', 'DESC');

    const [destinations, totalData] = await queryBuilder.getManyAndCount();

    const totalPage = Math.ceil(totalData / limit);

    const mappedDestinations = destinations.map((item) => ({
      id: item.id,
      country_id: item.state?.country?.id || '',
      country_name: item.state?.country?.name || '',
      state_id: item.state?.id || '',
      state_name: item.state?.name || '',
      city_id: item.city?.id,
      city_name: item.city?.name,
      location: item.city
        ? `${item.city.name}, ${item.state?.country?.name || ''}`
        : item.state
          ? `${item.state.name}, ${item.state.country?.name || ''}`
          : '',
      category_destination_id: item.category_destination?.id || '',
      category_destination_name: item.category_destination?.name || '',
      price: item.price,
      thumbnail: item.thumbnail,
      images: item.images,
      translations: item.translations?.map((t) => ({
        id: t.id,
        destination_id: item.id,
        language_code: t.language_code,
        name: t.name,
        slug: t.slug,
        description: t.description,
        detail_tour: t.detail_tour,
        facilities: t.facilities,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    }));

    return {
      message: 'Destinations retrieved successfully',
      data: mappedDestinations,
      datas: mappedDestinations,
      meta: {
        page,
        limit,
        total: totalData,
        totalData,
        totalPage,
        totalPages: totalPage,
      },
    };
  }

  // ─── Find Category Destination ───────────────────────────────────────────────
  async findCategoryDestination(): Promise<any> {
    const categoryDestination = await this.categoryDestinationRepository.find({
      order: { createdAt: 'ASC' },
    });

    if (categoryDestination.length === 0) {
      throw new HttpException('Category destination not found', HttpStatus.BAD_REQUEST);
    }

    return {
      message: 'Destination categories retrieved successfully',
      datas: categoryDestination.map((item) => ({
        id: item.id,
        name: item.name,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }

  // ─── Update Destination (Parallel Relation Lookups & Atomic Save) ───────────
  async updateDestination(
    destinationId: string,
    reqDto: UpdateDestinationDto,
  ): Promise<ResponseDestination> {
    const destination = await this.destinationRepository.findOne({
      where: { id: destinationId },
      relations: ['state', 'state.country', 'city', 'category_destination', 'translations'],
    });

    if (!destination) {
      throw new HttpException('Destination not found', HttpStatus.BAD_REQUEST);
    }

    const [findCategoryDestination, findState, findCity] = await Promise.all([
      reqDto.category_destination_id
        ? this.categoryDestinationRepository.findOne({
            where: { id: reqDto.category_destination_id },
          })
        : Promise.resolve(destination.category_destination),
      reqDto.state_id
        ? this.stateRepository.findOne({
            where: { id: reqDto.state_id },
            relations: ['country'],
          })
        : Promise.resolve(destination.state),
      reqDto.city_id
        ? this.cityRepository.findOne({ where: { id: reqDto.city_id } })
        : Promise.resolve(destination.city),
    ]);

    if (!findCategoryDestination || !findState) {
      throw new HttpException('Category destination or state not found', HttpStatus.BAD_REQUEST);
    }

    await this.destinationRepository.update(destinationId, {
      category_destination: { id: findCategoryDestination.id },
      state: { id: findState.id },
      city: findCity ? { id: findCity.id } : undefined,
      price: reqDto.price ?? destination.price,
      thumbnail: reqDto.thumbnail ?? destination.thumbnail,
      images: Array.isArray(reqDto.images) ? reqDto.images : destination.images,
    });

    let savedTranslations = destination.translations || [];
    if (Array.isArray(reqDto.translations) && reqDto.translations.length > 0) {
      const existingTransMap = new Map(
        (destination.translations || []).map((t) => [t.language_code, t]),
      );

      const translationsToUpsert = reqDto.translations.map((transDto) => {
        const existing = existingTransMap.get(transDto.language_code);
        return this.destinationTranslationRepository.create({
          id: existing ? existing.id : undefined,
          destination: { id: destination.id },
          language_code: transDto.language_code,
          name: transDto.name,
          slug: this.generateSlug(transDto.name),
          description: transDto.description,
          detail_tour: Array.isArray(transDto.detail_tour) ? transDto.detail_tour : [],
          facilities: Array.isArray(transDto.facilities) ? transDto.facilities : [],
        });
      });

      const savedEntities = await this.destinationTranslationRepository.save(translationsToUpsert);
      savedTranslations = savedEntities;
    }

    const name = reqDto.translations?.[0]?.name || savedTranslations?.[0]?.name;
    const message = name
      ? `Destination ${name} updated successfully`
      : `Destination with ID ${destinationId} updated successfully`;

    return {
      message,
      data: {
        id: destination.id,
        state_id: findState.id,
        city_id: findCity?.id,
        city_name: findCity?.name,
        location: findCity
          ? `${findCity.name}, ${findState.country ? findState.country.name : ''}`
          : `${findState.name}, ${findState.country ? findState.country.name : ''}`,
        category_destination_id: findCategoryDestination.id,
        price: reqDto.price ?? destination.price,
        thumbnail: reqDto.thumbnail ?? destination.thumbnail,
        images: reqDto.images ?? destination.images,
        translations: savedTranslations.map((t) => ({
          id: t.id,
          destination_id: destination.id,
          language_code: t.language_code,
          name: t.name,
          slug: t.slug,
          description: t.description,
          detail_tour: t.detail_tour,
          facilities: t.facilities,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      },
    };
  }

  // ─── Delete Destination ──────────────────────────────────────────────────────
  async deleteDestination(destinationId: string): Promise<ResponseDestination> {
    const destination = await this.destinationRepository.findOne({
      where: { id: destinationId },
      relations: ['translations'],
    });

    if (!destination) {
      throw new HttpException('Destination not found', HttpStatus.NOT_FOUND);
    }

    const translationName =
      destination.translations && destination.translations.length > 0
        ? destination.translations[0].name
        : undefined;

    await this.destinationRepository.delete(destinationId);

    const message = translationName
      ? `Destination ${translationName} deleted successfully`
      : `Destination with ID ${destinationId} deleted successfully`;

    return {
      message,
    };
  }

  // ─── Find Destination By Slug ────────────────────────────────────────────────
  async findDestinationBySlug(slug: string): Promise<ResponseDestination> {
    const translation = await this.destinationTranslationRepository.findOne({
      where: { slug },
      relations: [
        'destination',
        'destination.state',
        'destination.state.country',
        'destination.city',
        'destination.category_destination',
        'destination.translations',
      ],
    });

    if (!translation) {
      throw new HttpException('Destination not found', HttpStatus.NOT_FOUND);
    }

    const d = translation.destination;
    const name = translation.name;
    const message = name
      ? `Destination ${name} found successfully`
      : `Destination with slug ${slug} found successfully`;

    return {
      message,
      data: {
        id: d.id,
        state_id: d?.state?.id,
        city_id: d?.city?.id,
        city_name: d?.city?.name,
        location: d?.city
          ? `${d.city.name}, ${d?.state?.country?.name || ''}`
          : `${d?.state?.name}, ${d?.state?.country?.name || ''}`,
        category_destination_id: d?.category_destination?.id,
        price: d.price,
        thumbnail: d.thumbnail,
        images: d.images,
        country_id: d?.state?.country?.id,
        translations: d.translations?.map((item) => ({
          id: item.id,
          destination_id: d.id,
          language_code: item.language_code,
          name: item.name,
          slug: item.slug,
          description: item.description,
          detail_tour: item.detail_tour,
          facilities: item.facilities,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      },
    };
  }

  // ─── Find Destination By ID ──────────────────────────────────────────────────
  async findDestinationById(destinationId: string): Promise<ResponseDestination> {
    const findDestination = await this.destinationRepository.findOne({
      where: { id: destinationId },
      relations: ['state', 'state.country', 'city', 'category_destination', 'translations'],
    });

    if (!findDestination) {
      throw new HttpException('Destination not found', HttpStatus.BAD_REQUEST);
    }

    const name = findDestination.translations?.[0]?.name;
    const message = name
      ? `Destination ${name} found successfully`
      : `Destination with ID ${destinationId} found successfully`;

    return {
      message,
      data: {
        id: findDestination.id,
        state_id: findDestination?.state?.id,
        city_id: findDestination?.city?.id,
        city_name: findDestination?.city?.name,
        location: findDestination?.city
          ? `${findDestination.city.name}, ${findDestination?.state?.country?.name || ''}`
          : `${findDestination?.state?.name}, ${findDestination?.state?.country?.name || ''}`,
        category_destination_id: findDestination?.category_destination?.id,
        price: findDestination.price,
        thumbnail: findDestination.thumbnail,
        images: findDestination.images,
        country_id: findDestination?.state?.country?.id,
        translations: findDestination.translations?.map((item) => ({
          id: item.id,
          destination_id: findDestination.id,
          language_code: item.language_code,
          name: item.name,
          slug: item.slug,
          description: item.description,
          detail_tour: item.detail_tour,
          facilities: item.facilities,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      },
    };
  }
}
