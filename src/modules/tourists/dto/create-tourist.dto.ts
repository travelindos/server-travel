import { PartialType } from "@nestjs/mapped-types";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsString, Matches } from "class-validator";
import { Gender } from "../entities/tourist.entity";

export class CreateTouristDto {
  @IsNotEmpty({message: "book_tour_id is required"})
  @IsString({message: "book_tour_id must be string"})
  book_tour_id: string;

  @IsNotEmpty({message: "name is required"})
  @IsString({message: "name must be string"})
  name: string;

  @IsNotEmpty({message: "gender is required"})
  @IsEnum(Gender, {message: "gender must be enum"})
  gender: Gender;

  @IsNotEmpty({message: "phone_number is required"})
  @IsString({message: "phone_number must be string"})
  phone_number: string;

  @IsNotEmpty({message: "nationality is required"})
  @IsString({message: "nationality must be string"})
  nationality: string;

  @IsNotEmpty({message: "passport_number is required"})
  @IsString({message: "passport_number must be string"})
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/\s+/g, "") : value))
  @Matches(/^[a-zA-Z0-9]{5,15}$/, {
    message: "passport_number must be 5 to 15 alphanumeric characters without spaces or special characters",
  })
  passport_number: string;
}

export class UpdateTouristDto extends PartialType(CreateTouristDto) {
  @IsNotEmpty({message: "name is required"})
  @IsString({message: "name must be string"})
  name: string;

  @IsNotEmpty({message: "gender is required"})
  @IsEnum(Gender, {message: "gender must be enum"})
  gender: Gender;

  @IsNotEmpty({message: "phone_number is required"})
  @IsString({message: "phone_number must be string"})
  phone_number: string;

  @IsNotEmpty({message: "nationality is required"})
  @IsString({message: "nationality must be string"})
  nationality: string;

  @IsNotEmpty({message: "passport_number is required"})
  @IsString({message: "passport_number must be string"})
  @Transform(({ value }) => (typeof value === "string" ? value.replace(/\s+/g, "") : value))
  @Matches(/^[a-zA-Z0-9]{5,15}$/, {
    message: "passport_number must be 5 to 15 alphanumeric characters without spaces or special characters",
  })
  passport_number: string;
}
