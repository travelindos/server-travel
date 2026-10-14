import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { BookerDto, CreateApplicantDto } from './create-book-document-visa.dto';

export class UpdateBookDocumentVisaDetailsDto {
  @IsOptional()
  @IsString()
  booker_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BookerDto)
  booker?: BookerDto;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  shipping_address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}(T.*)?)$/, {
    message: 'target_travel_date must be in DD-MM-YYYY or YYYY-MM-DD format',
  })
  target_travel_date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApplicantDto)
  applicants?: CreateApplicantDto[];

  @IsOptional()
  @IsNumber()
  applicant_count?: number;
}
