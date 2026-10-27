import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Language } from '../entities/entertainment-attraction-translation.entity';
import { TicketType } from '../entities/entertainment-attraction-ticket.entity';

export class CreateTranslationAttractionDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString({ message: 'Description must be a string' })
  description: string;

  @IsNotEmpty({ message: 'Language is required' })
  @IsEnum(Language, { message: 'Language must be a valid enum (en, id, tr)' })
  language_code: Language;
}

export class CreateAttractionTicketDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty({ message: 'Ticket name is required' })
  @IsString({ message: 'Ticket name must be a string' })
  name: string;

  @IsNotEmpty({ message: 'Ticket type is required' })
  @IsEnum(TicketType, { message: 'Ticket type must be flat or package' })
  ticket_type: TicketType;

  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber({}, { message: 'Price must be a number' })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Pax count must be a number' })
  pax_count?: number;

  @IsOptional()
  @IsNumber({}, { message: 'min_age must be a number' })
  min_age?: number;

  @IsOptional()
  @IsNumber({}, { message: 'max_age must be a number' })
  max_age?: number;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}

export class CreateEntertainmentAttractionDto {
  @IsOptional()
  @IsString({ message: 'Country must be a string' })
  country_id?: string;

  @IsNotEmpty({ message: 'State is required' })
  @IsString({ message: 'State must be a string' })
  state_id: string;

  @IsNotEmpty({ message: 'Category is required' })
  @IsString({ message: 'Category must be a string' })
  category_destination_id: string;

  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  price?: number;

  @IsOptional()
  @IsString({ message: 'Thumbnail must be a string' })
  thumbnail?: string;

  @IsOptional()
  @IsArray({ message: 'Images must be an array' })
  @IsString({ each: true, message: 'Each image must be a string' })
  images?: string[];

  @IsOptional()
  @IsNumber({}, { message: 'daily_quota must be a number' })
  daily_quota?: number;

  @IsOptional()
  @IsArray({ message: 'Translations must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateTranslationAttractionDto)
  translations?: CreateTranslationAttractionDto[];

  @IsOptional()
  @IsArray({ message: 'Tickets must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateAttractionTicketDto)
  tickets?: CreateAttractionTicketDto[];
}

export class UpdateEntertainmentAttractionDto extends PartialType(
  CreateEntertainmentAttractionDto,
) {}
