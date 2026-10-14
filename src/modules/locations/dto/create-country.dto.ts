import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCountryDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;
}
