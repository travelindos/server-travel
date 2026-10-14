import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApplicantGender } from '../entities/book-document-visa-applicant.entity';

export class BookDocumentVisaItemDto {
  @IsOptional()
  @IsString()
  document_visa_id?: string;

  @IsOptional()
  @IsString()
  package_id?: string;

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsNumber()
  unit_price?: number;
}

export class BookerDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;
}

export class CreateApplicantDto {
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @IsNotEmpty()
  @IsEnum(ApplicantGender)
  gender: ApplicantGender;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}(T.*)?)$/, {
    message: 'birth_date must be in DD-MM-YYYY or YYYY-MM-DD format',
  })
  birth_date?: string;

  @IsOptional()
  @IsString()
  birth_place?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  passport_number?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}(T.*)?)$/, {
    message: 'passport_issue_date must be in DD-MM-YYYY or YYYY-MM-DD format',
  })
  passport_issue_date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}(T.*)?)$/, {
    message: 'passport_expiry_date must be in DD-MM-YYYY or YYYY-MM-DD format',
  })
  passport_expiry_date?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  tourist_id?: string;
}

export class CreateBookDocumentVisaDto {
  @IsNotEmpty()
  @IsString()
  document_visa_id: string;

  @IsNotEmpty()
  @IsString()
  package_id: string;

  @IsOptional()
  @IsString()
  customer_id?: string;

  @IsOptional()
  @IsString()
  booker_id?: string;

  @IsOptional()
  @IsString()
  booker_name?: string;

  @IsOptional()
  @IsEmail()
  booker_email?: string;

  @IsOptional()
  @IsString()
  booker_phone_number?: string;

  @IsOptional()
  @IsString()
  booker_phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BookerDto)
  booker?: BookerDto;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}(T.*)?)$/, {
    message: 'target_travel_date must be in DD-MM-YYYY or YYYY-MM-DD format',
  })
  target_travel_date?: string;

  @IsOptional()
  @IsString()
  shipping_address?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  applicant_count?: number;

  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookDocumentVisaItemDto)
  items?: BookDocumentVisaItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApplicantDto)
  applicants?: CreateApplicantDto[];
}
