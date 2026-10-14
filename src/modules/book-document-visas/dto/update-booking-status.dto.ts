import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { StatusBookDocumentVisa } from '../entities/book-document-visa.entity';

export class UpdateBookDocumentVisaStatusDto {
  @IsNotEmpty()
  @IsEnum(StatusBookDocumentVisa)
  status: StatusBookDocumentVisa;

  @IsOptional()
  @IsString()
  admin_notes?: string;

  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?.*)?|\d{2}-\d{2}-\d{4})$/, {
    message: 'appointment_date must be valid datetime format',
  })
  appointment_date?: string;

  @IsOptional()
  @IsString()
  appointment_location?: string;

  @IsOptional()
  @IsString()
  embassy_application_id?: string;

  @IsOptional()
  @IsString()
  tracking_number?: string;

  @IsOptional()
  @IsString()
  log_title?: string;

  @IsOptional()
  @IsString()
  log_note?: string;
}
