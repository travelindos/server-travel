import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { Roles } from '../entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Roles)
    private readonly rolesRepository: Repository<Roles>,
  ) {}

  async findAll(): Promise<any> {
    const roles = await this.rolesRepository.find({
      order: { level: 'DESC' },
    });
    return {
      message: 'Success',
      datas: roles.map((role) => ({
        id: role.id,
        name: role.name,
        code: role.code,
        level: role.level,
        permissions: role.permissions || [],
        description: role.description,
        self_register: role.self_register,
        created_at: role.createdAt,
        updated_at: role.updatedAt,
      })),
    };
  }

  async findOne(id: string): Promise<any> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      this.logger.error('Role not found');
      throw new NotFoundException('Role not found');
    }
    return {
      message: 'Success',
      data: {
        id: role.id,
        name: role.name,
        code: role.code,
        level: role.level,
        permissions: role.permissions || [],
        description: role.description,
        self_register: role.self_register,
        created_at: role.createdAt,
        updated_at: role.updatedAt,
      },
    };
  }

  async create(createRoleDto: CreateRoleDto): Promise<any> {
    const existing = await this.rolesRepository.findOne({
      where: { code: createRoleDto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Role code '${createRoleDto.code}' already exists`,
      );
    }

    const role = this.rolesRepository.create(createRoleDto);
    const savedRole = await this.rolesRepository.save(role);

    return {
      message: 'Role created successfully',
      data: savedRole,
    };
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<any> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    Object.assign(role, updateRoleDto);
    const updatedRole = await this.rolesRepository.save(role);

    return {
      message: 'Role updated successfully',
      data: updatedRole,
    };
  }

  async remove(id: string): Promise<any> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (['owner', 'developer', 'admin'].includes(role.code)) {
      throw new ForbiddenException(
        `Cannot delete core system role '${role.code}'`,
      );
    }

    await this.rolesRepository.remove(role);
    return {
      message: 'Role deleted successfully',
    };
  }
}
