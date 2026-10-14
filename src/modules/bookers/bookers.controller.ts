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
  UseGuards,
} from '@nestjs/common';
import { CustomerAuthGuard } from '../../common/middlewares/customer-auth.guard';
import { GetCustomer } from '../../common/decorators/get-customer.decorator';
import { CustomerAuthData } from '../../types/response/customers.type';
import { WebResponse } from '../../types/response/response.type';
import { BookersService } from './bookers.service';
import { CreateBookerDto } from './dto/create-booker.dto';
import { UpdateBookerDto } from './dto/update-booker.dto';

@Controller('bookers')
@UseGuards(CustomerAuthGuard)
export class BookersController {
  constructor(private readonly bookersService: BookersService) {}

  // POST /bookers (Create Booker Profile)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetCustomer() customer: CustomerAuthData,
    @Body() dto: CreateBookerDto,
  ): Promise<WebResponse> {
    const booker = await this.bookersService.createBooker(customer.id, dto);
    return {
      message: 'Create booker successfully',
      data: {
        id: booker.id,
        name: booker.name,
        email: booker.email,
        phone_number: booker.phone_number,
        created_at: booker.created_at,
      },
    };
  }

  // GET /bookers (Find All Customer Saved Bookers)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @GetCustomer() customer: CustomerAuthData,
  ): Promise<WebResponse> {
    const bookers = await this.bookersService.findAllByCustomer(customer.id);
    return {
      message: 'Find customer bookers successfully',
      data: bookers.map((b) => ({
        id: b.id,
        name: b.name,
        email: b.email,
        phone_number: b.phone_number,
        created_at: b.created_at,
      })),
    };
  }

  // GET /bookers/:id (Find Detail Booker by ID)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @GetCustomer() customer: CustomerAuthData,
    @Param('id') id: string,
  ): Promise<WebResponse> {
    const booker = await this.bookersService.findBookerById(id, customer.id);
    return {
      message: 'Find detail booker successfully',
      data: {
        id: booker.id,
        name: booker.name,
        email: booker.email,
        phone_number: booker.phone_number,
        created_at: booker.created_at,
      },
    };
  }

  // PUT /bookers/:id (Update Booker Profile)
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @GetCustomer() customer: CustomerAuthData,
    @Param('id') id: string,
    @Body() dto: UpdateBookerDto,
  ): Promise<WebResponse> {
    const booker = await this.bookersService.updateBooker(id, customer.id, dto);
    return {
      message: 'Update booker successfully',
      data: {
        id: booker.id,
        name: booker.name,
        email: booker.email,
        phone_number: booker.phone_number,
        created_at: booker.created_at,
      },
    };
  }

  // DELETE /bookers/:id (Delete Booker Profile)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @GetCustomer() customer: CustomerAuthData,
    @Param('id') id: string,
  ): Promise<WebResponse> {
    const result = await this.bookersService.deleteBooker(id, customer.id);
    return {
      message: result.message,
    };
  }
}
