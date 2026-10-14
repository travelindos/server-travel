import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { WebResponse } from '../../types/response/response.type';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // POST /locations (Create country with state/city seed data)
  @Permissions('countries:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCountryDto: CreateCountryDto,
  ): Promise<WebResponse> {
    const response = await this.locationsService.create(createCountryDto);
    return {
      message: 'Create country successfully',
      data: response.data,
    };
  }

  // GET /locations (Find all countries with hierarchy: states -> cities)
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<WebResponse> {
    const result = await this.locationsService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // GET /locations/:id (Find location country by ID)
  @Get(':id')
  @Permissions('countries:read')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    return this.locationsService.findOne(id);
  }

  // PUT /locations/:id (Update location country by ID)
  @Permissions('countries:update')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateCountryDto: UpdateCountryDto,
  ): Promise<WebResponse> {
    return this.locationsService.update(id, updateCountryDto);
  }

  // DELETE /locations/:id (Delete location country by ID)
  @Permissions('countries:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    return this.locationsService.remove(id);
  }
}
