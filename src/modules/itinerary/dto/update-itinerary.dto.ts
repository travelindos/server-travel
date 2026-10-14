import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class UpdateItineraryItemDto {
  @IsNotEmpty({ message: 'Destination ID is required' })
  @IsString({ message: 'Destination ID must be a string' })
  destination_id: string;

  @IsOptional()
  @IsString({ message: 'Item ID must be a string' })
  item_id?: string;

  @IsNotEmpty({ message: 'Visit date is required' })
  @IsDateString({}, { message: 'Visit date must be a valid date string (YYYY-MM-DD)' })
  visit_date: string;
}

export class UpdateItineraryDto {
  @IsOptional()
  @IsString({ message: 'Itinerary name must be a string' })
  name?: string;

  @IsOptional()
  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => UpdateItineraryItemDto)
  items?: UpdateItineraryItemDto[];
}
