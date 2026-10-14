import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { FileReviewStatus } from '../entities/book-document-applicant-file.entity';

export class UploadApplicantFileDto {
  @IsNotEmpty()
  @IsString()
  requirement_id: string;

  @IsNotEmpty()
  @IsString()
  file_url: string;

  @IsNotEmpty()
  @IsString()
  file_name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  file_size_bytes?: number;
}

export class ReviewApplicantFileDto {
  @IsNotEmpty()
  @IsEnum(FileReviewStatus)
  review_status: FileReviewStatus;

  @IsOptional()
  @IsString()
  rejection_note?: string;
}
