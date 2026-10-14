import { IsEmail, IsNotEmpty } from 'class-validator';

export class EmailRequestDto {
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  @IsEmail({}, { message: 'Format email tidak valid (contoh: nama@domain.com)' })
  email: string;
}
