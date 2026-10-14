import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '../../tourists/entities/tourist.entity';

class BookMotorItemDto {
  @IsNotEmpty()
  @IsString()
  motor_id: string;

  @IsNotEmpty()
  @IsNumber()
  qty: number;
}

class TouristDto {
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
}

export class CreateBookMotorDto {
  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  booker_id?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookMotorItemDto)
  items: BookMotorItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TouristDto)
  tourists?: TouristDto[];

  @IsNotEmpty()
  @IsString()
  @Matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}(T.*)?)$/, {
    message: 'start_date must be in DD-MM-YYYY format (e.g. 16-11-2026)',
  })
  start_date: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}(T.*)?)$/, {
    message: 'end_date must be in DD-MM-YYYY format (e.g. 18-11-2026)',
  })
  end_date: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  add_ons?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
