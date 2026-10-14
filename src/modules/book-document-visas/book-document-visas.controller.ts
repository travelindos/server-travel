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
import { BookDocumentVisasService } from './book-document-visas.service';
import { CreateBookDocumentVisaDto } from './dto/create-book-document-visa.dto';
import { FilterBookDocumentVisaDto } from './dto/filter-book-document-visa.dto';
import { UpdateBookDocumentVisaDetailsDto } from './dto/update-book-document-visa-details.dto';
import {
  ReviewApplicantFileDto,
  UploadApplicantFileDto,
} from './dto/upload-applicant-file.dto';
import { UpdateBookDocumentVisaStatusDto } from './dto/update-booking-status.dto';

@Controller('book-document-visas')
export class BookDocumentVisasController {
  constructor(
    private readonly bookingService: BookDocumentVisasService,
  ) {}

  // POST /book-document-visas (Customer or Admin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateBookDocumentVisaDto,
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

  // POST /book-document-visas/:bookingId/applicants/:applicantId/files — Upload requirement file
  @Post(':bookingId/applicants/:applicantId/files')
  @HttpCode(HttpStatus.OK)
  async uploadApplicantFile(
    @Param('bookingId') bookingId: string,
    @Param('applicantId') applicantId: string,
    @Body() dto: UploadApplicantFileDto,
    @GetCustomer() customer?: CustomerAuthData,
  ): Promise<WebResponse> {
    const result = await this.bookingService.uploadApplicantFile(
      bookingId,
      applicantId,
      dto,
      customer?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PATCH /book-document-visas/files/:fileId/review (Staff/Admin Only)
  @Permissions('book-document-visas:review')
  @Patch('files/:fileId/review')
  @HttpCode(HttpStatus.OK)
  async reviewApplicantFile(
    @Param('fileId') fileId: string,
    @Body() dto: ReviewApplicantFileDto,
    @CurrentUser() reviewer: User,
  ): Promise<WebResponse> {
    const result = await this.bookingService.reviewApplicantFile(
      fileId,
      dto,
      reviewer,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PATCH /book-document-visas/:id/cancel — cancel booking
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

  // PATCH /book-document-visas/:id (Update Order Details: Booker, Notes, Applicants)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateDetails(
    @Param('id') id: string,
    @Body() dto: UpdateBookDocumentVisaDetailsDto,
    @GetCustomer() customer?: CustomerAuthData,
    @CurrentUser() user?: User,
  ): Promise<WebResponse> {
    const result = await this.bookingService.updateBookingDetails(
      id,
      dto,
      customer?.id,
      user,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /book-document-visas/user/my-bookings (Internal Admin/Staff My Bookings)
  @Permissions('book-document-visas:read')
  @Get('user/my-bookings')
  @HttpCode(HttpStatus.OK)
  async findMyBookings(
    @Query() query: FilterBookDocumentVisaDto,
    @CurrentUser() user: User,
  ): Promise<WebResponse> {
    const result = await this.bookingService.findAll({ ...query, user_id: user.id });
    return {
      message: result.message,
      data: result.data || result.datas,
      meta: result.meta,
    };
  }

  // GET /book-document-visas
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: FilterBookDocumentVisaDto,
    @GetCustomer() customer?: CustomerAuthData,
  ): Promise<WebResponse> {
    const result = await this.bookingService.findAll(query, customer?.id);
    return {
      message: result.message,
      data: result.data || result.datas,
      meta: result.meta,
    };
  }

  // GET /book-document-visas/:id
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

  // PATCH /book-document-visas/:id/status (Admin/Staff Only)
  @Permissions('book-document-visas:update-status')
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookDocumentVisaStatusDto,
    @CurrentUser() user?: User,
  ): Promise<WebResponse> {
    const result = await this.bookingService.updateStatus(id, dto, user);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /book-document-visas/:id (Admin Only)
  @Permissions('book-document-visas:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.bookingService.remove(id);
    return {
      message: result.message,
    };
  }
}
