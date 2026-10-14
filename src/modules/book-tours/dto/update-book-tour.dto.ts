import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateBookTourDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  add_ons?: string[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
