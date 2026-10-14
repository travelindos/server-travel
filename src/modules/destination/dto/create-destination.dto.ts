import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateTranslationDestinationDto } from './create-translation-destination.dto';

// create destination dto
export class CreateDestinationDto {
  @IsNotEmpty({ message: 'State is required' })
  @IsString({ message: 'State must be a string' })
  state_id: string;

  @IsOptional()
  @IsString({ message: 'City must be a string' })
  city_id?: string;

  @IsNotEmpty({ message: 'Category Destination is required' })
  @IsString({ message: 'Category Destination must be a string' })
  category_destination_id: string;

  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber({}, { message: 'Price must be a number' })
  price: number;

  @IsOptional()
  @IsString({ message: 'Thumbnail must be a string' })
  thumbnail?: string;

  @IsOptional()
  @IsArray({ message: 'Images must be an array of strings' })
  @IsString({ each: true, message: 'Each image must be a string' })
  images?: string[];

  @IsOptional()
  @IsArray({ message: 'Translations must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateTranslationDestinationDto)
  translations?: CreateTranslationDestinationDto[];
}

// update destination dto
export class UpdateDestinationDto extends PartialType(CreateDestinationDto) {}
