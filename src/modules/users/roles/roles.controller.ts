import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { WebResponse } from '../../../types/response/response.type';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles:read')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.rolesService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  @Permissions('roles:read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.rolesService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Post()
  @Permissions('roles:create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto): Promise<WebResponse> {
    const result = await this.rolesService.create(createRoleDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Patch(':id')
  @Permissions('roles:update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<WebResponse> {
    const result = await this.rolesService.update(id, updateRoleDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  @Permissions('roles:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.rolesService.remove(id);
    return {
      message: result.message,
    };
  }
}
