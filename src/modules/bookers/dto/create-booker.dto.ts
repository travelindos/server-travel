import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateBookerDto {
  @IsNotEmpty({ message: 'Booker name is required' })
  @IsString({ message: 'Booker name must be a string' })
  name: string;

  @IsNotEmpty({ message: 'Booker email is required' })
  @IsEmail({}, { message: 'Booker email must be a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Booker phone number is required' })
  @IsString({ message: 'Booker phone number must be a string' })
  @Matches(/^[0-9]+$/, {
    message: 'Booker phone number must contain digits only without letters or special characters',
  })
  phone_number: string;
}
