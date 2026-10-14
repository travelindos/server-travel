import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StatusBookEntertainmentAttraction } from '../entities/book-entertainment-attraction.entity';
import { Gender, AgeGroup } from '../../tourists/entities/tourist.entity';

export class TouristDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  passport_number: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsNotEmpty()
  @IsEnum(Gender)
  gender: Gender;

  @IsNotEmpty()
  @IsString()
  nationality: string;

  /**
   * Tanggal lahir format DD-MM-YYYY, wajib jika tiket memiliki batasan usia (min_age / max_age).
   * Contoh: "15-08-2016"
   */
  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/, { message: 'birth_date must be in format DD-MM-YYYY (e.g. 15-08-2016)' })
  birth_date?: string;

  @IsOptional()
  @IsEnum(AgeGroup, { message: 'age_group must be adult, child, or infant' })
  age_group?: AgeGroup;

  /**
   * Relasikan tourist ke tiket yang dipesan, untuk validasi usia
   */
  @IsOptional()
  @IsString()
  ticket_id?: string;
}

export class BookEntertainmentItemDto {
  @IsOptional()
  @IsString()
  entertainment_attraction_id?: string;

  @IsOptional()
  @IsString()
  ticket_id?: string;

  @IsNotEmpty()
  @IsNumber()
  qty: number;

  @IsOptional()
  @IsNumber()
  unit_price?: number;
}

export class CreateBookEntertainmentAttractionDto {
  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  booker_id?: string;

  @IsOptional()
  @IsString()
  pemesan_id?: string; // Backward compatibility

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookEntertainmentItemDto)
  items?: BookEntertainmentItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TouristDto)
  tourists?: TouristDto[];

  @IsOptional()
  @Matches(/^\d{2}-\d{2}-\d{4}$/, { message: 'booking_date must be in format DD-MM-YYYY (e.g. 15-10-2026)' })
  booking_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsEnum(StatusBookEntertainmentAttraction)
  status?: StatusBookEntertainmentAttraction;
}

export class SubmitTouristsDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TouristDto)
  tourists: TouristDto[];
}

export class UpdateBookEntertainmentAttractionDto {
  @IsOptional()
  @IsString()
  booker_id?: string;

  @IsOptional()
  @IsString()
  pemesan_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TouristDto)
  tourists?: TouristDto[];
}
