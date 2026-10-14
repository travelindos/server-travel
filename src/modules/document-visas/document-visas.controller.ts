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
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { WebResponse } from '../../types/response/response.type';
import { DocumentVisasService } from './document-visas.service';
import {
  CreateDocumentVisaDto,
  UpdateDocumentVisaDto,
} from './dto/create-document-visa.dto';
import { FilterDocumentVisaDto } from './dto/filter-document-visa.dto';

@Controller('document-visas')
export class DocumentVisasController {
  constructor(private readonly documentVisasService: DocumentVisasService) {}

  // POST /document-visas (Admin Create)
  @Permissions('document-visas:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() reqDto: CreateDocumentVisaDto): Promise<WebResponse> {
    const result = await this.documentVisasService.create(reqDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /document-visas (Public Catalog / Filter)
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: FilterDocumentVisaDto): Promise<WebResponse> {
    const result = await this.documentVisasService.findAll(query);
    return {
      message: result.message,
      data: result.datas,
      meta: result.meta,
    };
  }

  // GET /document-visas/categories (Public Categories)
  @Public()
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async findCategories(): Promise<WebResponse> {
    const result = await this.documentVisasService.findCategories();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // GET /document-visas/slug/:slug (Public Detail by Slug)
  @Public()
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(
    @Param('slug') slug: string,
    @Query('lang') lang?: string,
  ): Promise<WebResponse> {
    const result = await this.documentVisasService.findBySlug(slug, lang);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /document-visas/:id (Public Detail by ID)
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id') id: string,
    @Query('lang') lang?: string,
  ): Promise<WebResponse> {
    const result = await this.documentVisasService.findById(id, lang);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PUT /document-visas/:id (Admin Update)
  @Permissions('document-visas:update')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() reqDto: UpdateDocumentVisaDto,
  ): Promise<WebResponse> {
    const result = await this.documentVisasService.update(id, reqDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /document-visas/:id (Admin Soft Delete)
  @Permissions('document-visas:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.documentVisasService.delete(id);
    return {
      message: result.message,
    };
  }
}
