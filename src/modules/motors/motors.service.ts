import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource, Repository } from 'typeorm';
import { Logger } from 'winston';
import { Merek } from './entities/merek.entity';
import { State } from '../locations/entities/state.entity';
import { Motor } from './entities/motor.entity';
import { CreateMotorDto, UpdateMotorDto } from './dto/create-motor.dto';
import { FilterMotorDto } from './dto/filter-motor.dto';
import { MotorResponse } from '../../types/response/motor.type';
import { MotorTranslation } from './entities/motor-translation.entity';
import { Variant } from './entities/variant.entity';
import { MotorPrice } from './entities/motor-price.entity';

@Injectable()
export class MotorsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Motor)
    private readonly motorRepository: Repository<Motor>,
    @InjectRepository(Merek)
    private readonly merekRepository: Repository<Merek>,
    @InjectRepository(State)
    private readonly stateRepository: Repository<State>,
    @InjectRepository(MotorTranslation)
    private readonly translationRepository: Repository<MotorTranslation>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    @InjectRepository(MotorPrice)
    private readonly priceRepository: Repository<MotorPrice>,
    private readonly dataSource: DataSource,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private mapToResponseData(motor: Motor): any {
    return {
      id: motor.id,
      merek_id: motor.merek?.id || (motor as any).merek_id || null,
      merek: motor.merek ? { id: motor.merek.id, name_merek: motor.merek.name_merek } : null,
      state_id: motor.state?.id || (motor as any).state_id || null,
      state: motor.state ? { id: motor.state.id, name: motor.state.name } : null,
      country_id: motor.state?.country?.id || (motor as any).country_id || null,
      engine_cc: motor.engine_cc,
      thumbnail: motor.thumbnail,
      is_available: motor.is_available,
      translations: motor.translations?.map((t) => ({
        id: t.id,
        language_code: t.language_code,
        name_motor: t.name_motor,
        slug: t.slug,
        description: t.description,
      })) || [],
      variants: motor.variants?.map((v) => ({
        id: v.id,
        color: v.color,
      })) || [],
      motor_prices: motor.motor_prices?.map((p) => ({
        id: p.id,
        price_type: p.price_type,
        price: Number(p.price),
      })) || [],
      created_at: motor.created_at,
      updated_at: motor.updated_at,
    };
  }

  // ─── Create Motor (Optimized Batch Insertion & Parallel Checks) ─────────────
  async create(createMotorDto: CreateMotorDto): Promise<MotorResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        merek_id,
        state_id,
        translations,
        variants,
        prices,
        ...motorData
      } = createMotorDto;

      // Parallel validation checks for Merek and State
      const [merek, state] = await Promise.all([
        queryRunner.manager.findOneBy(Merek, { id: merek_id }),
        queryRunner.manager.findOne(State, { where: { id: state_id }, relations: ['country'] }),
      ]);

      if (!merek) {
        throw new NotFoundException('Merek not found');
      }
      if (!state) {
        throw new NotFoundException('State not found');
      }

      const motor = this.motorRepository.create({
        ...motorData,
        merek,
        state,
      });

      const savedMotor = await queryRunner.manager.save(motor);

      // Parallel Batch Save for Relations
      const savePromises: Promise<any>[] = [];

      if (translations && translations.length > 0) {
        const motorTranslations = translations.map((t) =>
          this.translationRepository.create({
            ...t,
            motor: savedMotor,
            slug: this.generateSlug(t.name_motor),
          }),
        );
        savePromises.push(queryRunner.manager.save(motorTranslations));
      }

      if (variants && variants.length > 0) {
        const motorVariants = variants.map((v) =>
          this.variantRepository.create({
            ...v,
            motor: savedMotor,
          }),
        );
        savePromises.push(queryRunner.manager.save(motorVariants));
      }

      if (prices && prices.length > 0) {
        const motorPrices = prices.map((p) =>
          this.priceRepository.create({
            ...p,
            motor: savedMotor,
          }),
        );
        savePromises.push(queryRunner.manager.save(motorPrices));
      }

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      await queryRunner.commitTransaction();
      this.logger.debug(`Success create motor: ${savedMotor.id}`);

      const result = await this.motorRepository.findOne({
        where: { id: savedMotor.id },
        relations: [
          'merek',
          'state',
          'state.country',
          'translations',
          'variants',
          'motor_prices',
        ],
      });

      const motorName = result?.translations?.[0]?.name_motor;
      const createMessage = motorName
        ? `Motor ${motorName} created successfully`
        : `Motor with ID ${savedMotor.id} created successfully`;

      return {
        message: createMessage,
        data: this.mapToResponseData(result!),
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error create motor', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Find All Motors (QueryBuilder with Pagination & Searching) ─────────────
  async findAll(query?: FilterMotorDto): Promise<MotorResponse & { meta?: any }> {
    const page = Math.max(1, Number(query?.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query?.limit || 10)));
    const skip = (page - 1) * limit;

    const qb = this.motorRepository
      .createQueryBuilder('motor')
      .leftJoinAndSelect('motor.merek', 'merek')
      .leftJoinAndSelect('motor.state', 'state')
      .leftJoinAndSelect('state.country', 'country')
      .leftJoinAndSelect('motor.translations', 'translations')
      .leftJoinAndSelect('motor.variants', 'variants')
      .leftJoinAndSelect('motor.motor_prices', 'motor_prices');

    if (query?.merek_id) {
      qb.andWhere('motor.merek.id = :merek_id', { merek_id: query.merek_id });
    }

    if (query?.state_id) {
      qb.andWhere('motor.state.id = :state_id', { state_id: query.state_id });
    }

    if (query?.country_id) {
      qb.andWhere('country.id = :country_id', { country_id: query.country_id });
    }

    if (query?.is_available !== undefined) {
      qb.andWhere('motor.is_available = :is_available', {
        is_available: query.is_available,
      });
    }

    if (query?.engine_cc) {
      qb.andWhere('motor.engine_cc = :engine_cc', {
        engine_cc: query.engine_cc,
      });
    }

    if (query?.min_price || query?.max_price) {
      qb.andWhere((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('mp.motor_id')
          .from('motor_prices', 'mp')
          .where('mp.price_type = :priceType', { priceType: 'daily' });

        if (query?.min_price) {
          subQuery.andWhere('mp.price >= :min_price', {
            min_price: query.min_price,
          });
        }
        if (query?.max_price) {
          subQuery.andWhere('mp.price <= :max_price', {
            max_price: query.max_price,
          });
        }

        return `motor.id IN ${subQuery.getQuery()}`;
      });
    }

    if (query?.search) {
      qb.andWhere(
        '(translations.name_motor LIKE :search OR merek.name_merek LIKE :search OR state.name LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [motors, total] = await qb
      .skip(skip)
      .take(limit)
      .orderBy('motor.createdAt', 'DESC')
      .getManyAndCount();

    this.logger.debug(`Success find all motors (page: ${page}, limit: ${limit}, total: ${total})`);

    return {
      message: 'Motors found successfully',
      data: motors.map((m) => this.mapToResponseData(m)),
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    };
  }

  // ─── Find One Motor ─────────────────────────────────────────────────────────
  async findOne(id: string): Promise<MotorResponse> {
    let motor = await this.motorRepository.findOne({
      where: { id },
      relations: [
        'merek',
        'state',
        'state.country',
        'translations',
        'variants',
        'motor_prices',
      ],
    });

    if (!motor) {
      const translation = await this.translationRepository.findOne({
        where: { slug: id },
        relations: [
          'motor',
          'motor.merek',
          'motor.state',
          'motor.state.country',
          'motor.translations',
          'motor.variants',
          'motor.motor_prices',
        ],
      });
      if (translation?.motor) {
        motor = translation.motor;
      }
    }

    if (!motor) {
      this.logger.error(`Motor not found: ${id}`);
      throw new NotFoundException('Motor not found');
    }

    this.logger.debug(`Success find one motor: ${id}`);

    const motorName = motor.translations?.[0]?.name_motor;
    const message = motorName
      ? `Motor ${motorName} found successfully`
      : `Motor with ID ${id} found successfully`;

    return {
      message,
      data: this.mapToResponseData(motor),
    };
  }

  // ─── Find Motor By Slug ───────────────────────────────────────────────────
  async findBySlug(slug: string): Promise<MotorResponse> {
    const translation = await this.translationRepository.findOne({
      where: { slug },
      relations: [
        'motor',
        'motor.merek',
        'motor.state',
        'motor.state.country',
        'motor.translations',
        'motor.variants',
        'motor.motor_prices',
      ],
    });

    if (!translation || !translation.motor) {
      this.logger.error(`Motor with slug not found: ${slug}`);
      throw new NotFoundException('Motor not found');
    }

    this.logger.debug(`Success find motor by slug: ${slug}`);

    const motorName = translation.name_motor || translation.motor.translations?.[0]?.name_motor;
    return {
      message: `Motor ${motorName} found successfully`,
      data: this.mapToResponseData(translation.motor),
    };
  }

  // ─── Update Motor (Optimized Single Transaction & Parallel Deletions) ──────
  async update(
    id: string,
    updateMotorDto: UpdateMotorDto,
  ): Promise<MotorResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const motor = await queryRunner.manager.findOne(Motor, {
        where: { id },
        relations: ['merek', 'state', 'translations', 'variants', 'motor_prices'],
      });

      if (!motor) {
        throw new NotFoundException('Motor not found');
      }

      const {
        merek_id,
        state_id,
        translations,
        variants,
        prices,
        ...motorData
      } = updateMotorDto;

      if (merek_id) {
        const merek = await queryRunner.manager.findOneBy(Merek, { id: merek_id });
        if (!merek) {
          throw new NotFoundException('Merek not found');
        }
        motor.merek = merek;
      }

      if (state_id) {
        const state = await queryRunner.manager.findOneBy(State, { id: state_id });
        if (!state) {
          throw new NotFoundException('State not found');
        }
        motor.state = state;
      }

      Object.assign(motor, motorData);
      const updatedMotor = await queryRunner.manager.save(motor);

      // Delete stale relations in parallel
      const deletePromises: Promise<any>[] = [];
      if (translations !== undefined) {
        deletePromises.push(
          queryRunner.manager.delete(MotorTranslation, { motor: { id: motor.id } }),
        );
      }
      if (variants !== undefined) {
        deletePromises.push(
          queryRunner.manager.delete(Variant, { motor: { id: motor.id } }),
        );
      }
      if (prices !== undefined) {
        deletePromises.push(
          queryRunner.manager.delete(MotorPrice, { motor: { id: motor.id } }),
        );
      }
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }

      // Save new relations in parallel
      const savePromises: Promise<any>[] = [];
      if (translations && translations.length > 0) {
        const motorTranslations = translations.map((t) =>
          this.translationRepository.create({
            ...t,
            motor: updatedMotor,
            slug: this.generateSlug(t.name_motor),
          }),
        );
        savePromises.push(queryRunner.manager.save(motorTranslations));
      }

      if (variants && variants.length > 0) {
        const motorVariants = variants.map((v) =>
          this.variantRepository.create({
            ...v,
            motor: updatedMotor,
          }),
        );
        savePromises.push(queryRunner.manager.save(motorVariants));
      }

      if (prices && prices.length > 0) {
        const motorPrices = prices.map((p) =>
          this.priceRepository.create({
            ...p,
            motor: updatedMotor,
          }),
        );
        savePromises.push(queryRunner.manager.save(motorPrices));
      }

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      await queryRunner.commitTransaction();
      this.logger.debug(`Success update motor ${id}`);

      const result = await this.motorRepository.findOne({
        where: { id: updatedMotor.id },
        relations: [
          'merek',
          'state',
          'state.country',
          'translations',
          'variants',
          'motor_prices',
        ],
      });

      const motorName = result?.translations?.[0]?.name_motor;
      const updateMessage = motorName
        ? `Motor ${motorName} updated successfully`
        : `Motor with ID ${id} updated successfully`;

      return {
        message: updateMessage,
        data: this.mapToResponseData(result!),
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error update motor', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Delete Motor (Soft Remove) ─────────────────────────────────────────────
  async remove(id: string): Promise<MotorResponse> {
    const motor = await this.motorRepository.findOne({
      where: { id },
      relations: ['translations'],
    });
    if (!motor) {
      throw new NotFoundException('Motor not found');
    }

    const motorName = motor.translations?.[0]?.name_motor;
    await this.motorRepository.softRemove(motor);
    this.logger.debug(`Success delete motor ${id}`);

    return {
      message: motorName
        ? `Motor ${motorName} deleted successfully`
        : `Motor with ID ${id} deleted successfully`,
    };
  }
}
