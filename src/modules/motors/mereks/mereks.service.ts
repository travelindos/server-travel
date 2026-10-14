import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Merek } from '../entities/merek.entity';
import { CreateMerekDto, UpdateMerekDto } from './dto/create-merek.dto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MerekResponse } from '../../../types/response/motor.type';

@Injectable()
export class MereksService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Merek)
    private readonly merekRepository: Repository<Merek>,
  ) {}

  async create(createMerekDto: CreateMerekDto): Promise<MerekResponse> {
    const existingMerek = await this.merekRepository.findOneBy({
      name_merek: createMerekDto.name_merek,
    });

    if (existingMerek) {
      this.logger.error(`Merek with name ${createMerekDto.name_merek} already exists`);
      throw new ConflictException(`Merek with name ${createMerekDto.name_merek} already exists`);
    }

    const merek = this.merekRepository.create(createMerekDto);
    await this.merekRepository.save(merek);

    this.logger.debug('Success create merek');

    return {
      message: 'Merek created successfully',
      data: {
        id: merek.id,
        name_merek: merek.name_merek,
        createdAt: merek.created_at,
        updatedAt: merek.updated_at,
      },
    };
  }

  async findAll(): Promise<MerekResponse> {
    const mereks = await this.merekRepository.find();
    const mappedMereks = mereks.map((m) => ({
      id: m.id,
      name_merek: m.name_merek,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    this.logger.debug('Success find all mereks');

    return {
      message: 'Mereks found successfully',
      datas: mappedMereks,
    };
  }

  async findOne(id: string): Promise<MerekResponse> {
    const merek = await this.merekRepository.findOneBy({ id });
    if (!merek) {
      this.logger.error(`Merek with id ${id} not found`);
      throw new NotFoundException('Merek not found');
    }

    this.logger.debug(`Success find one merek ${id}`);

    return {
      message: 'Merek found successfully',
      data: {
        id: merek.id,
        name_merek: merek.name_merek,
        createdAt: merek.created_at,
        updatedAt: merek.updated_at,
      },
    };
  }

  async update(id: string, updateMerekDto: UpdateMerekDto): Promise<MerekResponse> {
    const merek = await this.merekRepository.findOneBy({ id });
    if (!merek) {
      this.logger.error(`Merek with id ${id} not found`);
      throw new NotFoundException('Merek not found');
    }

    if (updateMerekDto.name_merek) {
      const existingMerek = await this.merekRepository.findOneBy({
        name_merek: updateMerekDto.name_merek,
        id: Not(id),
      });

      if (existingMerek) {
        throw new ConflictException(`Merek with name ${updateMerekDto.name_merek} already exists`);
      }
    }

    Object.assign(merek, updateMerekDto);
    const updatedMerek = await this.merekRepository.save(merek);

    this.logger.debug(`Success update merek ${id}`);

    return {
      message: 'Merek updated successfully',
      data: {
        id: updatedMerek.id,
        name_merek: updatedMerek.name_merek,
        createdAt: updatedMerek.created_at,
        updatedAt: updatedMerek.updated_at,
      },
    };
  }

  async remove(id: string): Promise<MerekResponse> {
    const merek = await this.merekRepository.findOneBy({ id });
    if (!merek) {
      this.logger.error(`Merek with id ${id} not found`);
      throw new NotFoundException('Merek not found');
    }

    await this.merekRepository.softRemove(merek);

    this.logger.debug(`Success delete merek ${id}`);

    return {
      message: 'Merek deleted successfully',
    };
  }
}
