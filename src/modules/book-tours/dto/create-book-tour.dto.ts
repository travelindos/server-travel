import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../../tourists/entities/tourist.entity';

export class CreateTouristDto {
  @IsNotEmpty({ message: 'Tourist name is required' })
  @IsString({ message: 'Tourist name must be a string' })
  name: string;

  @IsNotEmpty({ message: 'Gender is required' })
  @IsEnum(Gender, { message: 'Gender must be Mr, Miss, or Mrs' })
  gender: Gender;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^[0-9]+$/, {
    message: 'Tourist phone number must contain digits only without letters or special characters',
  })
  phone_number?: string;

  @IsNotEmpty({ message: 'Nationality is required' })
  @IsString({ message: 'Nationality must be a string' })
  nationality: string;

  @IsNotEmpty({ message: 'Passport number is required' })
  @IsString({ message: 'Passport number must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @Matches(/^[a-zA-Z0-9]{5,15}$/, {
    message: 'Passport number must be 5 to 15 alphanumeric characters without spaces or special characters',
  })
  passport_number: string;
}

export class CreateBookTourDto {
  @IsNotEmpty({ message: 'Itinerary ID is required' })
  @IsString({ message: 'Itinerary ID must be a string' })
  itinerary_id: string;

  @IsOptional()
  @IsString({ message: 'Booker ID must be a string' })
  booker_id?: string;

  @IsOptional()
  @IsString({ message: 'Booker name must be a string' })
  booker_name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Booker email must be a valid email address' })
  booker_email?: string;

  @IsOptional()
  @IsString({ message: 'Booker phone must be a string' })
  booker_phone?: string;

  @IsOptional()
  @IsArray({ message: 'Add-ons must be an array of strings' })
  @IsString({ each: true, message: 'Each add-on ID must be a string' })
  add_ons?: string[];

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note?: string;

  @IsNotEmpty({ message: 'Tourists list is required' })
  @IsArray({ message: 'Tourists must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateTouristDto)
  tourists: CreateTouristDto[];
}
