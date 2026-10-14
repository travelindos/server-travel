import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Language } from '../entities/destination-translation.entity';

// create translation destination dto
export class CreateTranslationDestinationDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString({ message: 'Description must be a string' })
  description: string;

  @IsNotEmpty({ message: 'Language is required' })
  @IsEnum(Language, { message: 'Language must be a enum' })
  language_code: Language;

  @IsNotEmpty({ message: 'Detail Tour is required' })
  @IsArray({ message: 'Detail Tour must be an array string' })
  detail_tour: string[];

  @IsNotEmpty({ message: 'Facilities is required' })
  @IsArray({ message: 'Facilities must be an array string' })
  facilities: string[];
}

// update translation destination dto
export class UpdateTranslationDestinationDto extends PartialType(
  CreateTranslationDestinationDto,
) {}
