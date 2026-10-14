import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

export class CustomerRegisterDto {
  @IsNotEmpty({ message: 'Nama lengkap tidak boleh kosong' })
  @IsString({ message: 'Nama harus berupa teks' })
  @MinLength(3, { message: 'Nama lengkap harus terdiri dari minimal 3 karakter' })
  name: string;

  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  @IsEmail({}, { message: 'Format email tidak valid (contoh: nama@domain.com)' })
  email: string;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString({ message: 'Password harus berupa teks' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password harus mengandung huruf besar, huruf kecil, dan angka/simbol',
  })
  password: string;

  @IsNotEmpty({ message: 'Konfirmasi password tidak boleh kosong' })
  @IsString({ message: 'Konfirmasi password harus berupa teks' })
  @Match('password', { message: 'Konfirmasi password tidak cocok dengan password utama' })
  confirmPassword: string;

}
