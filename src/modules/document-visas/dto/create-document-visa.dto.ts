import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EntryType, VisaType } from '../entities/document-visa.entity';

export class CreateDocumentVisaTranslationDto {
  @IsNotEmpty({ message: 'language_code is required' })
  @IsString({ message: 'language_code must be a string' })
  language_code: string;

  @IsNotEmpty({ message: 'title is required' })
  @IsString({ message: 'title must be a string' })
  title: string;

  @IsNotEmpty({ message: 'description is required' })
  @IsString({ message: 'description must be a string' })
  description: string;

  @IsOptional()
  @IsString({ message: 'terms_conditions must be a string' })
  terms_conditions?: string;

  @IsOptional()
  @IsString({ message: 'submission_process must be a string' })
  submission_process?: string;
}

export class CreateDocumentVisaPackageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty({ message: 'Package name is required' })
  name: string | Record<string, string>;

  @IsOptional()
  @IsNumber({}, { message: 'processing_time_days must be a number' })
  @Min(1, { message: 'processing_time_days must be at least 1 day' })
  processing_time_days?: number;

  @IsOptional()
  @IsNumber({}, { message: 'embassy_fee must be a number' })
  embassy_fee?: number;

  @IsOptional()
  @IsNumber({}, { message: 'service_fee must be a number' })
  service_fee?: number;

  @IsOptional()
  @IsNumber({}, { message: 'total_price must be a number' })
  total_price?: number;

  @IsOptional()
  description?: string | Record<string, string>;

  @IsOptional()
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean;
}

export class CreateDocumentVisaRequirementDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty({ message: 'Requirement name is required' })
  name: string | Record<string, string>;

  @IsOptional()
  description?: string | Record<string, string>;

  @IsOptional()
  @IsString({ message: 'allowed_file_types must be a string' })
  allowed_file_types?: string;

  @IsOptional()
  @IsNumber({}, { message: 'max_file_size_mb must be a number' })
  max_file_size_mb?: number;

  @IsOptional()
  @IsBoolean({ message: 'is_mandatory must be a boolean' })
  is_mandatory?: boolean;

  @IsOptional()
  @IsString({ message: 'example_file_url must be a string' })
  example_file_url?: string;

  @IsOptional()
  @IsNumber({}, { message: 'order_priority must be a number' })
  order_priority?: number;
}

export class CreateDocumentVisaDto {
  @IsNotEmpty({ message: 'category_id is required' })
  @IsString({ message: 'category_id must be a string' })
  category_id: string;

  @IsNotEmpty({ message: 'country_id (destination) is required' })
  @IsString({ message: 'country_id must be a string' })
  country_id: string;

  @IsOptional()
  @IsString({ message: 'origin_country_id must be a string' })
  origin_country_id?: string;

  @IsOptional()
  @IsEnum(VisaType, { message: 'Invalid visa_type' })
  visa_type?: VisaType;

  @IsOptional()
  @IsEnum(EntryType, { message: 'Invalid entry_type' })
  entry_type?: EntryType;

  @IsOptional()
  @IsNumber({}, { message: 'validity_days must be a number' })
  validity_days?: number;

  @IsOptional()
  @IsNumber({}, { message: 'max_stay_days must be a number' })
  max_stay_days?: number;

  @IsOptional()
  @IsString({ message: 'thumbnail must be a string' })
  thumbnail?: string;

  @IsOptional()
  @IsArray({ message: 'images must be an array' })
  @IsString({ each: true, message: 'each image must be a string' })
  images?: string[];

  @IsOptional()
  @IsBoolean({ message: 'is_interview_required must be a boolean' })
  is_interview_required?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'is_biometric_required must be a boolean' })
  is_biometric_required?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'starting_price must be a number' })
  starting_price?: number;

  @IsOptional()
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active?: boolean;

  @IsOptional()
  @IsArray({ message: 'translations must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentVisaTranslationDto)
  translations?: CreateDocumentVisaTranslationDto[];

  @IsOptional()
  @IsArray({ message: 'packages must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentVisaPackageDto)
  packages?: CreateDocumentVisaPackageDto[];

  @IsOptional()
  @IsArray({ message: 'requirements must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentVisaRequirementDto)
  requirements?: CreateDocumentVisaRequirementDto[];
}

export class UpdateDocumentVisaDto extends PartialType(CreateDocumentVisaDto) {}
