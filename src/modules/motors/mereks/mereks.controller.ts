import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { MereksService } from './mereks.service';
import { CreateMerekDto, UpdateMerekDto } from './dto/create-merek.dto';
import { WebResponse } from '../../../types/response/response.type';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@Controller('mereks')
export class MereksController {
  constructor(private readonly mereksService: MereksService) {}

  @Permissions('motor-brands:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createMerekDto: CreateMerekDto): Promise<WebResponse> {
    const result = await this.mereksService.create(createMerekDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.mereksService.findAll();
    return {
      message: result.message,
      data: result.data || result.datas,
    };
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.mereksService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Permissions('motor-brands:update')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateMerekDto: UpdateMerekDto): Promise<WebResponse> {
    const result = await this.mereksService.update(id, updateMerekDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Permissions('motor-brands:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.mereksService.remove(id);
    return {
      message: result.message,
    };
  }
}
