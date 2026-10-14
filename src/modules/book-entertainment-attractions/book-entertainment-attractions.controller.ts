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
} from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { GetCustomer } from '../../common/decorators/get-customer.decorator';
import { CustomerAuthData } from '../../types/response/customers.type';
import { WebResponse } from '../../types/response/response.type';
import { User } from '../users/entities/user.entity';
import { BookEntertainmentAttractionsService } from './book-entertainment-attractions.service';
import { CreateBookEntertainmentAttractionDto } from './dto/create-book-entertainment-attraction.dto';
import { SubmitTouristsDto } from './dto/create-book-entertainment-attraction.dto';
import { UpdateBookEntertainmentAttractionDto } from './dto/create-book-entertainment-attraction.dto';
import { FilterBookEntertainmentAttractionDto } from './dto/filter-book-entertainment-attraction.dto';

@Controller('book-entertainment-attractions')
export class BookEntertainmentAttractionsController {
  constructor(
    private readonly bookingService: BookEntertainmentAttractionsService,
  ) {}

  // POST /book-entertainment-attractions (Customer or Admin) — creates DRAFT booking
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBookEntertainmentAttractionDto,
    @GetCustomer() customer?: CustomerAuthData,
    @CurrentUser() user?: User,
  ): Promise<WebResponse> {
    const result = await this.bookingService.create(
      dto,
      customer?.id,
      user,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // POST /book-entertainment-attractions/:id/tourists — submit tourists, validates age, upgrades to PENDING
  @Post(':id/tourists')
  @HttpCode(HttpStatus.OK)
  async submitTourists(
    @Param('id') id: string,
    @Body() dto: SubmitTouristsDto,
    @GetCustomer() customer?: CustomerAuthData,
  ): Promise<WebResponse> {
    const result = await this.bookingService.submitTourists(id, dto, customer?.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PATCH /book-entertainment-attractions/:id — update booker & submit tourists, validates age, upgrades to PENDING
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateBookingDetails(
    @Param('id') id: string,
    @Body() dto: UpdateBookEntertainmentAttractionDto,
    @GetCustomer() customer?: CustomerAuthData,
  ): Promise<WebResponse> {
    const result = await this.bookingService.updateBookingDetails(id, dto, customer?.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PATCH /book-entertainment-attractions/:id/cancel — cancel booking (Customer or Admin)
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @GetCustomer() customer?: CustomerAuthData,
    @CurrentUser() user?: User,
  ): Promise<WebResponse> {
    const result = await this.bookingService.cancelBooking(id, customer?.id, user);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /book-entertainment-attractions/user/my-bookings (Internal Admin/Staff My Bookings)
  @Permissions('book-entertainment-attractions:read')
  @Get('user/my-bookings')
  @HttpCode(HttpStatus.OK)
  async findMyBookings(
    @Query() query: FilterBookEntertainmentAttractionDto,
    @CurrentUser() user: User,
  ): Promise<WebResponse> {
    const result = await this.bookingService.findAll({ ...query, user_id: user.id });
    return {
      message: result.message,
      data: result.data || result.datas,
      meta: result.meta,
    };
  }

  // GET /book-entertainment-attractions
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: FilterBookEntertainmentAttractionDto,
    @GetCustomer() customer?: CustomerAuthData,
  ): Promise<WebResponse> {
    const result = await this.bookingService.findAll(query, customer?.id);
    return {
      message: result.message,
      data: result.data || result.datas,
      meta: result.meta,
    };
  }

  // GET /book-entertainment-attractions/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
    @GetCustomer() customer?: CustomerAuthData,
  ): Promise<WebResponse> {
    const result = await this.bookingService.findOne(id, customer?.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PATCH /book-entertainment-attractions/:id/status (Admin Only — Tracks User ID)
  @Permissions('book-entertainment-attractions:update-status')
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser() user?: User,
  ): Promise<WebResponse> {
    const result = await this.bookingService.updateStatus(id, body.status as any, user);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /book-entertainment-attractions/:id (Admin Only)
  @Permissions('book-entertainment-attractions:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.bookingService.remove(id);
    return {
      message: result.message,
    };
  }
}
