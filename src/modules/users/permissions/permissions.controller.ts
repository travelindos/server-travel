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
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('permissions:read')
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.permissionsService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  @Permissions('permissions:read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.permissionsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Post()
  @Permissions('permissions:create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreatePermissionDto,
  ): Promise<WebResponse> {
    const result = await this.permissionsService.create(createDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Patch(':id')
  @Permissions('permissions:update')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePermissionDto,
  ): Promise<WebResponse> {
    const result = await this.permissionsService.update(id, updateDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  @Permissions('permissions:delete')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.permissionsService.remove(id);
    return {
      message: result.message,
    };
  }
}
