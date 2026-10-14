import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { Permission } from '../entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<any> {
    const permissions = await this.permissionRepository.find({
      order: { group: 'ASC', code: 'ASC' },
    });
    return {
      message: 'Success',
      datas: permissions,
    };
  }

  async findOne(id: string): Promise<any> {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return {
      message: 'Success',
      data: permission,
    };
  }

  async create(createDto: CreatePermissionDto): Promise<any> {
    const existing = await this.permissionRepository.findOne({
      where: { code: createDto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Permission code '${createDto.code}' already exists`,
      );
    }

    const permission = this.permissionRepository.create(createDto);
    const saved = await this.permissionRepository.save(permission);

    return {
      message: 'Permission created successfully',
      data: saved,
    };
  }

  async update(id: string, updateDto: UpdatePermissionDto): Promise<any> {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    Object.assign(permission, updateDto);
    const saved = await this.permissionRepository.save(permission);

    return {
      message: 'Permission updated successfully',
      data: saved,
    };
  }

  async remove(id: string): Promise<any> {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.permissionRepository.remove(permission);
    return {
      message: 'Permission deleted successfully',
    };
  }
}
