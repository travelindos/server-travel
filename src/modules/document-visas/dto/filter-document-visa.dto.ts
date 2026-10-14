import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EntryType, VisaType } from '../entities/document-visa.entity';

export class FilterDocumentVisaDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category_id?: string;

  @IsOptional()
  @IsString()
  category_slug?: string;

  @IsOptional()
  @IsString()
  country_id?: string;

  @IsOptional()
  @IsString()
  origin_country_id?: string;

  @IsOptional()
  @IsEnum(VisaType)
  visa_type?: VisaType;

  @IsOptional()
  @IsEnum(EntryType)
  entry_type?: EntryType;

  @IsOptional()
  @IsString()
  lang?: string;
}
