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
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { WebResponse } from '../../types/response/response.type';
import { DestinationService } from './destination.service';
import {
  CreateDestinationDto,
  UpdateDestinationDto,
} from './dto/create-destination.dto';
import { FilterDestinationDto } from './dto/filter-destination.dto';

@Controller('destinations')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}

  // POST /destinations or /entertainment-attractions
  @Permissions('destinations:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() reqDto: CreateDestinationDto): Promise<WebResponse> {
    const result = await this.destinationService.create(reqDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /destinations or /entertainment-attractions
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAllDestinationWithTranslation(
    @Query() query: FilterDestinationDto,
  ): Promise<WebResponse> {
    const result =
      await this.destinationService.findAllDestinationWithTranslation(query);
    return {
      message: result.message,
      data: result.datas,
      meta: result.meta,
    };
  }

  // GET /destinations/categories or /entertainment-attractions/categories
  @Public()
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async findAllCategoriesDestination(): Promise<WebResponse> {
    const result = await this.destinationService.findCategoryDestination();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // GET /destinations/slug/:slug or /entertainment-attractions/slug/:slug
  @Public()
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string): Promise<WebResponse> {
    const result = await this.destinationService.findDestinationBySlug(slug);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /destinations/:id or /entertainment-attractions/:id
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.destinationService.findDestinationById(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PUT /destinations/:id or /entertainment-attractions/:id
  @Permissions('destinations:update')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() reqDto: UpdateDestinationDto,
  ): Promise<WebResponse> {
    const result = await this.destinationService.updateDestination(id, reqDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /destinations/:id or /entertainment-attractions/:id
  @Permissions('destinations:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.destinationService.deleteDestination(id);
    return {
      message: result.message,
    };
  }
}
