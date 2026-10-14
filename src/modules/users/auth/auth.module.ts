import { Module } from '@nestjs/common';
import { EmailService } from '../../../common/emails/emails.service';
import { SessionModule } from '../../session/session.module';
import { UsersService } from '../users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [SessionModule],
  controllers: [AuthController],
  providers: [AuthService, UsersService, EmailService],
})
export class AuthModule {}
