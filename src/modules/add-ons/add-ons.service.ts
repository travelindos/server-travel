import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { AddOn } from './entities/add-on.entity';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/create-add-on.dto';
import { AddOnResponse } from '../../types/response/add-on.type';

@Injectable()
export class AddOnsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(AddOn)
    private readonly addOnRepository: Repository<AddOn>,
  ) {}

  async create(createAddOnDto: CreateAddOnDto): Promise<AddOnResponse> {
    const addOn = this.addOnRepository.create(createAddOnDto);
    const savedAddOn = await this.addOnRepository.save(addOn);

    this.logger.debug('Success create add-on');

    return {
      message: 'Add-on created successfully',
      data: savedAddOn as any,
    };
  }

  async findAll(): Promise<AddOnResponse> {
    const addOns = await this.addOnRepository.find();

    this.logger.debug('Success find all add-ons');

    return {
      message: 'Add-ons found successfully',
      datas: addOns as any,
    };
  }

  async findOne(id: string): Promise<AddOnResponse> {
    const addOn = await this.addOnRepository.findOne({ where: { id } });

    if (!addOn) {
      this.logger.error(`Add-on not found ${id}`);
      throw new NotFoundException('Add-on not found');
    }

    this.logger.debug(`Success find one add-on ${id}`);

    return {
      message: 'Add-on found successfully',
      data: addOn as any,
    };
  }

  async update(id: string, updateAddOnDto: UpdateAddOnDto): Promise<AddOnResponse> {
    const addOn = await this.addOnRepository.findOne({ where: { id } });
    if (!addOn) {
      this.logger.error(`Add-on not found ${id}`);
      throw new NotFoundException('Add-on not found');
    }

    Object.assign(addOn, updateAddOnDto);
    const updatedAddOn = await this.addOnRepository.save(addOn);

    this.logger.debug(`Success update add-on ${id}`);

    return {
      message: 'Add-on updated successfully',
      data: updatedAddOn as any,
    };
  }

  async remove(id: string): Promise<AddOnResponse> {
    const addOn = await this.addOnRepository.findOne({ where: { id } });
    if (!addOn) {
      this.logger.error(`Add-on not found ${id}`);
      throw new NotFoundException('Add-on not found');
    }

    await this.addOnRepository.softRemove(addOn);

    this.logger.debug(`Success delete add-on ${id}`);

    return {
      message: 'Add-on deleted successfully',
    };
  }

  async findByCategory(category: string): Promise<AddOnResponse> {
    const addOns = await this.addOnRepository.find({
      where: { category: category as any },
    });

    this.logger.debug(`Success find add-ons by category ${category}`);

    return {
      message: 'Add-ons found successfully',
      datas: addOns as any,
    };
  }
}
