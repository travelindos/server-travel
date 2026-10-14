import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Match } from '../../../common/decorators/match.decorator';

export class CustomerResetPasswordDto {
  @IsOptional()
  @IsString({ message: 'Verification code must be a string' })
  @Transform(({ obj }) => obj.code || obj.verify_code || obj.verify_token)
  code?: string;

  @IsNotEmpty({ message: 'New password is required' })
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'New password must contain uppercase, lowercase, and number/symbol',
  })
  @Transform(({ obj }) => obj.new_password || obj.password || obj.newPassword)
  new_password: string;

  @IsNotEmpty({ message: 'Confirm new password is required' })
  @IsString({ message: 'Confirm new password must be a string' })
  @Match('new_password', { message: 'Confirm new password does not match new password' })
  @Transform(({ obj }) => obj.confirm_new_password || obj.retryPassword || obj.retry_password || obj.confirmPassword)
  confirm_new_password: string;
}
