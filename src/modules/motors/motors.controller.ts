import { Controller, Get, Post, Body, Param, Delete, Put, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { MotorsService } from './motors.service';
import { CreateMotorDto, UpdateMotorDto } from './dto/create-motor.dto';
import { FilterMotorDto } from './dto/filter-motor.dto';
import { WebResponse } from '../../types/response/response.type';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('motors')
export class MotorsController {
  constructor(private readonly motorsService: MotorsService) {}

  @Permissions('motors:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createMotorDto: CreateMotorDto): Promise<WebResponse> {
    const result = await this.motorsService.create(createMotorDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: FilterMotorDto): Promise<WebResponse> {
    const result = await this.motorsService.findAll(query);
    return {
      message: result.message,
      data: result.data || result.datas,
      meta: (result as any).meta,
    };
  }

  @Public()
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string): Promise<WebResponse> {
    const result = await this.motorsService.findBySlug(slug);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.motorsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Permissions('motors:update')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateMotorDto: UpdateMotorDto): Promise<WebResponse> {
    const result = await this.motorsService.update(id, updateMotorDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Permissions('motors:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.motorsService.remove(id);
    return {
      message: result.message,
    };
  }
}
