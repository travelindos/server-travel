import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { GetCustomer } from '../../common/decorators/get-customer.decorator';
import { CustomerAuthData } from '../../types/response/customers.type';
import { WebResponse } from '../../types/response/response.type';
import { User } from '../users/entities/user.entity';
import { BookMotorsService } from './book-motors.service';
import { CreateBookMotorDto } from './dto/create-book-motor.dto';
import { UpdateBookMotorDto } from './dto/update-book-motor.dto';
import { FilterBookMotorDto } from './dto/filter-book-motor.dto';

@Controller('book-motors')
export class BookMotorsController {
  constructor(private readonly bookMotorsService: BookMotorsService) {}

  // POST /book-motors (Create booking by Customer or Admin)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createBookMotorDto: CreateBookMotorDto,
    @GetCustomer() customer?: CustomerAuthData,
    @CurrentUser() user?: User,
  ): Promise<WebResponse> {
    const result = await this.bookMotorsService.create(
      createBookMotorDto,
      user,
      customer?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PUT /book-motors/:id (Update booking by Customer or Admin)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateBookMotorDto: UpdateBookMotorDto,
    @GetCustomer() customer?: CustomerAuthData,
    @CurrentUser() user?: User,
  ): Promise<WebResponse> {
    const result = await this.bookMotorsService.update(
      id,
      updateBookMotorDto,
      user,
      customer?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // GET /book-motors
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: FilterBookMotorDto,
    @GetCustomer() customer?: CustomerAuthData,
  ): Promise<WebResponse> {
    const result = await this.bookMotorsService.findAll(query, customer?.id);
    return {
      message: result.message,
      data: result.data || result.datas,
      meta: result.meta,
    };
  }

  // GET /book-motors/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
    @GetCustomer() customer?: CustomerAuthData,
  ): Promise<WebResponse> {
    const result = await this.bookMotorsService.findOne(id, customer?.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PATCH /book-motors/:id/status (Admin Only)
  @Permissions('book-motors:update-status')
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ): Promise<WebResponse> {
    const result = await this.bookMotorsService.updateStatus(
      id,
      body.status as any,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /book-motors/:id (Admin Only)
  @Permissions('book-motors:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.bookMotorsService.remove(id);
    return {
      message: result.message,
    };
  }
}
