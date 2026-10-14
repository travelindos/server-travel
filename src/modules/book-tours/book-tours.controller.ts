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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerAuthGuard } from '../../common/middlewares/customer-auth.guard';
import { GetCustomer } from '../../common/decorators/get-customer.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CustomerAuthData } from '../../types/response/customers.type';
import { WebResponse } from '../../types/response/response.type';
import { BookToursService } from './book-tours.service';
import { CreateBookTourDto } from './dto/create-book-tour.dto';
import { FilterBookTourDto } from './dto/filter-book-tour.dto';

@Controller('book-tours')
@UseGuards(CustomerAuthGuard)
export class BookToursController {
  constructor(private readonly bookToursService: BookToursService) {}

  // POST /book-tours (Create Book Tour)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetCustomer() customer: CustomerAuthData,
    @Body() createBookTourDto: CreateBookTourDto,
  ): Promise<WebResponse> {
    const result = await this.bookToursService.create(
      customer.id,
      createBookTourDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /book-tours (Find All Customer Book Tours)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @GetCustomer() customer: CustomerAuthData,
    @Query() query: FilterBookTourDto,
  ): Promise<WebResponse> {
    const result = await this.bookToursService.findAll(customer.id, query);
    return {
      message: result.message,
      data: result.datas || result.data,
      meta: result.meta,
    };
  }

  // GET /book-tours/:id (Find Detail Book Tour by ID)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @GetCustomer() customer: CustomerAuthData,
    @Param('id') id: string,
  ): Promise<WebResponse> {
    const result = await this.bookToursService.findBookTourId(id, customer.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PATCH /book-tours/:id/status (Update Status Book Tour)
  @Permissions('book-tours:update-status')
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ): Promise<WebResponse> {
    const result = await this.bookToursService.updateStatusBookTour(
      id,
      body.status as any,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /book-tours/:id (Delete Book Tour)
  @Permissions('book-tours:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @GetCustomer() customer: CustomerAuthData,
    @Param('id') id: string,
  ): Promise<WebResponse> {
    const result = await this.bookToursService.remove(id, customer.id);
    return {
      message: result.message,
    };
  }
}
