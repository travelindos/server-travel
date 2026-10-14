import { PartialType } from "@nestjs/mapped-types";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateMotorTranslationDto } from "./create-motor-translation.dto";
import { CreateMotorVariantDto } from "./create-motor-variant.dto";
import { CreateMotorPriceDto } from "./create-motor-price.dto";

export class CreateMotorDto {
  @IsNumber()
  @IsNotEmpty()
  engine_cc: number;

  @IsString()
  @IsNotEmpty()
  thumbnail: string;

  @IsBoolean()
  @IsNotEmpty()
  is_available: boolean;

  @IsString()
  @IsNotEmpty()
  merek_id: string;

  @IsString()
  @IsNotEmpty()
  state_id: string;

  @IsOptional()
  @IsString()
  country_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMotorTranslationDto)
  translations?: CreateMotorTranslationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMotorVariantDto)
  variants?: CreateMotorVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMotorPriceDto)
  prices?: CreateMotorPriceDto[];
}

export class UpdateMotorDto extends PartialType(CreateMotorDto) {}
