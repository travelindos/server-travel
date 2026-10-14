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
import {
  CreateEntertainmentAttractionDto,
  UpdateEntertainmentAttractionDto,
} from './dto/create-entertainment-attraction.dto';
import { FilterEntertainmentAttractionDto } from './dto/filter-entertainment-attraction.dto';
import { EntertainmentAttractionsService } from './entertainment-attractions.service';

@Controller('entertainment-attractions')
export class EntertainmentAttractionsController {
  constructor(
    private readonly entertainmentService: EntertainmentAttractionsService,
  ) {}

  // POST /entertainment-attractions
  @Permissions('entertainment-attractions:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() reqDto: CreateEntertainmentAttractionDto,
  ): Promise<WebResponse> {
    const result = await this.entertainmentService.create(reqDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /entertainment-attractions
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: FilterEntertainmentAttractionDto,
  ): Promise<WebResponse> {
    const result = await this.entertainmentService.findAllWithTranslation(query);
    return {
      message: result.message,
      data: result.datas,
      meta: result.meta,
    };
  }

  // GET /entertainment-attractions/categories
  @Public()
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async findCategories(): Promise<WebResponse> {
    const result = await this.entertainmentService.findCategories();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // GET /entertainment-attractions/slug/:slug
  @Public()
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string): Promise<WebResponse> {
    const result = await this.entertainmentService.findBySlug(slug);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /entertainment-attractions/:id
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.entertainmentService.findById(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PUT /entertainment-attractions/:id
  @Permissions('entertainment-attractions:update')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() reqDto: UpdateEntertainmentAttractionDto,
  ): Promise<WebResponse> {
    const result = await this.entertainmentService.update(id, reqDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /entertainment-attractions/:id
  @Permissions('entertainment-attractions:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.entertainmentService.delete(id);
    return {
      message: result.message,
    };
  }
}
