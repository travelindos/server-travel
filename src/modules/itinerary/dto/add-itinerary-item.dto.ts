import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddItineraryItemDto {
  @IsOptional()
  @IsString({ message: 'Itinerary name must be a string' })
  name?: string;

  @IsNotEmpty({ message: 'Destination ID is required' })
  @IsString({ message: 'Destination ID must be a string' })
  destination_id: string;

  @IsNotEmpty({ message: 'Visit date is required' })
  @IsDateString({}, { message: 'Visit date must be a valid ISO date string (YYYY-MM-DD)' })
  visit_date: string;
}
