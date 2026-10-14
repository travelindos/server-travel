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
import { CurrentUser } from '../../common/decorators/user.decorator';
import { WebResponse } from '../../types/response/response.type';
import { CreateTouristDto, UpdateTouristDto } from './dto/create-tourist.dto';
import { TouristsService } from './tourists.service';
import { CreateManyTouristsDto } from './dto/create-many-tourists.dto';

@Controller('tourists')
export class TouristsController {
  constructor(private readonly touristsService: TouristsService) {}

  @Post('create')
  @Permissions('tourists:create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: any,
    @Body() createTouristDto: CreateTouristDto,
  ): Promise<WebResponse> {
    const result = await this.touristsService.createTourist(
      createTouristDto,
      user.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Post('create-many')
  @Permissions('tourists:create')
  @HttpCode(HttpStatus.CREATED)
  async createMany(
    @CurrentUser() user: any,
    @Body() createManyTouristsDto: CreateManyTouristsDto,
  ): Promise<WebResponse> {
    const result = await this.touristsService.createMany(
      createManyTouristsDto,
      user.id,
    );
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get('find-all')
  @Permissions('tourists:read')
  @HttpCode(HttpStatus.OK)
  async findAll(@CurrentUser() user: any): Promise<WebResponse> {
    const result = await this.touristsService.findAll(user.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get('find/:id')
  @Permissions('tourists:read')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<WebResponse> {
    const result = await this.touristsService.findTouristById(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put('update/:id')
  @Permissions('tourists:update')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTouristDto: UpdateTouristDto,
  ): Promise<WebResponse> {
    const result = await this.touristsService.update(
      id,
      updateTouristDto,
      user.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete('delete/:id')
  @Permissions('tourists:delete')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<WebResponse> {
    const result = await this.touristsService.remove(id, user.id);
    return {
      message: result.message,
    };
  }
}
