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
import { AddItineraryItemDto } from './dto/add-itinerary-item.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { ItineraryService } from './itinerary.service';

@Controller('itineraries')
@UseGuards(CustomerAuthGuard)
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  // POST /itineraries/items (Add or Create Itinerary Item)
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  async addOrCreateItem(
    @GetCustomer() customer: CustomerAuthData,
    @Body() dto: AddItineraryItemDto,
  ): Promise<WebResponse> {
    const result = await this.itineraryService.addOrCreateItem(customer.id, dto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PUT /itineraries/:id/items (Update Itinerary Visit Dates / Order)
  @Put(':id/items')
  @HttpCode(HttpStatus.OK)
  async updateItinerary(
    @GetCustomer() customer: CustomerAuthData,
    @Param('id') itineraryId: string,
    @Body() body: any,
  ): Promise<WebResponse> {
    const result = await this.itineraryService.updateItinerary(
      customer.id,
      itineraryId,
      body,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /itineraries/:id/items/:itemId (Remove Item from Itinerary)
  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @GetCustomer() customer: CustomerAuthData,
    @Param('id') itineraryId: string,
    @Param('itemId') itemId: string,
  ): Promise<WebResponse> {
    const result = await this.itineraryService.removeItem(
      customer.id,
      itineraryId,
      itemId,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /itineraries/:id (Delete Master Itinerary)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteItinerary(
    @GetCustomer() customer: CustomerAuthData,
    @Param('id') itineraryId: string,
  ): Promise<WebResponse> {
    const result = await this.itineraryService.deleteItinerary(
      customer.id,
      itineraryId,
    );
    return {
      message: result.message,
    };
  }
   
  // GET /itineraries (Get My Itineraries)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findMyItineraries(
    @GetCustomer() customer: CustomerAuthData,
  ): Promise<WebResponse> {
    const result = await this.itineraryService.findCustomerItineraries(
      customer.id,
    );
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // GET /itineraries/:id (Get Itinerary by ID)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @GetCustomer() customer: CustomerAuthData,
    @Param('id') itineraryId: string,
  ): Promise<WebResponse> {
    const result = await this.itineraryService.findItineraryById(
      customer.id,
      itineraryId,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }
}
