import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateBookerDto {
  @IsOptional()
  @IsString({ message: 'Booker name must be a string' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Booker email must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Booker phone number must be a string' })
  @Matches(/^[0-9]+$/, {
    message: 'Booker phone number must contain digits only without letters or special characters',
  })
  phone_number?: string;
}
