import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EmailService } from '../../../common/emails/emails.service';
import { EmailType } from '../../../types/email.type';
import { AuthResponse } from '../../../types/response/auth.type';
import { Repository } from 'typeorm';

import { EmailReqDto } from '../dto/email_req.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset_password.dto';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { UsersService } from '../users.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  // register user (strictly for role 'owner' only, maximum 1 owner account)
  async register(userDto: RegisterDto): Promise<AuthResponse> {
    // Find role 'owner'
    const role = await this.usersService.findRoleByCode('owner');

    if (!role) {
      this.logger.error('owner role not found in database');
      throw new InternalServerErrorException(
        'Owner role not found. Please contact database administrator.',
      );
    }

    // Ensure userDto role_id is always set to owner
    userDto.role_id = role.id;

    // Check if owner role allows self-register
    if (role.self_register === false) {
      this.logger.error(
        'Owner role self-register is disabled',
        'role.self_register',
        role.self_register,
      );
      throw new BadRequestException('Registration is currently closed');
    }

    // Strictly limit owner accounts: maximum 1 owner account allowed
    const countOwner = await this.userRepository.count({
      where: {
        role: {
          id: role.id,
        },
      },
    });

    if (countOwner >= 1) {
      this.logger.error(
        `Registration rejected: An owner account already exists (count: ${countOwner})`,
      );
      throw new BadRequestException(
        'An owner account has already been registered. Only 1 owner account is permitted. Other staff accounts must be created by the owner inside the dashboard.',
      );
    }

    // Check if user exists
    const findUser = await this.usersService.findByEmail(userDto.email);
    if (findUser) {
      this.logger.error('User already exists');
      throw new BadRequestException('User with this email already exists');
    }

    const user = await this.usersService.create(userDto);

    // Send verification email
    try {
      const baseSite = (process.env.ADMIN_SITE || '').replace(/\/+$/, '');
      await this.emailService.sendMail(EmailType.VERIFY_ACCOUNT, {
        links: `${baseSite}/verify-account?verify_token=${user.verify_code}`,
        email: user.email,
        subjectMessage: 'Verify your account',
      });
    } catch (emailErr: any) {
      this.logger.error('Failed to send verification email', emailErr);
    }

    this.logger.debug(
      `User registered successfully, check your email for verification`,
    );

    return {
      message:
        'User registered successfully, check your email for verification',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_verified: user.is_verified,
        role_id: user.role?.id,
      },
    };
  }

  // verify account user
  async verifyAccount(token: string): Promise<AuthResponse> {
    const user = await this.usersService.findByVerifyCode(token);
    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.is_verified === true) {
      return {
        message: 'Account already verified',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_verified: true,
          role_id: user.role_id,
        },
      };
    }

    if (
      user.verify_code_expires_at &&
      new Date() > user.verify_code_expires_at
    ) {
      throw new BadRequestException('Verification token has expired');
    }

    user.is_verified = true;
    user.verify_code = null;
    user.verify_code_expires_at = null;

    await this.userRepository.save(user);
    return {
      message: 'Account verified successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_verified: user.is_verified,
        role_id: user.role_id,
      },
    };
  }

  // resend account user
  async resendVerifyAccount(reqDto: EmailReqDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(reqDto.email);
    if (!user) {
      this.logger.error('User not found');
      throw new BadRequestException('User not found');
    }

    if (user.is_verified === true) {
      this.logger.error('User already verified');
      throw new BadRequestException('User already verified');
    }

    const tokens = crypto.randomBytes(40).toString('hex');

    const tokenVerify = `${tokens}-${Date.now()}`;
    user.verify_code = tokenVerify;
    user.verify_code_expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // send email for verification account
    try {
      const baseSite = (process.env.ADMIN_SITE || '').replace(/\/+$/, '');
      await this.emailService.sendMail(EmailType.VERIFY_ACCOUNT, {
        links: `${baseSite}/verify-account?verify_token=${tokenVerify}`,
        email: user.email,
        subjectMessage: 'Verify your account',
      });
    } catch (emailErr: any) {
      this.logger.error('Failed to send verification email', emailErr);
    }

    this.logger.log('User resend verify account successfully', user.id);

    await this.userRepository.save(user);
    return {
      message: 'Account resend verify successfully, please check your email',
    };
  }

  // login user
  async login(reqDto: LoginDto, ip: string): Promise<AuthResponse> {
    // check user exists
    const user = await this.usersService.findByEmail(reqDto.email);
    if (!user) {
      this.logger.error('User not found');
      throw new BadRequestException('User not found');
    }

    const isMatch = await bcrypt.compare(reqDto.password, user.password);
    if (!isMatch) {
      this.logger.error('Invalid password');
      throw new BadRequestException('Invalid password');
    }

    // Check if user is verified
    if (user.is_verified === false) {
      this.logger.error('Account not verified');
      throw new BadRequestException(
        'Account is not verified. Please check your email to verify your account.',
      );
    }

    // generate token
    const token = crypto.randomBytes(100).toString('hex').toUpperCase();
    const refreshTokenExpiresAt = new Date();
    // set per day
    refreshTokenExpiresAt.setHours(refreshTokenExpiresAt.getHours() + 24);

    // save token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const session = this.sessionRepository.create({
      token: tokenHash,
      user: {
        id: user.id,
      },
      expiresAt: refreshTokenExpiresAt,
      ip: ip,
    });
    await this.sessionRepository.save(session);

    return {
      message: 'Account login successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_verified: user.is_verified,
        role_id: user.role_id,
        session: token,
      },
    };
  }

  // logout user
  async logout(token: string): Promise<AuthResponse> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await this.sessionRepository.findOne({
      where: { token: tokenHash },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.sessionRepository.remove(session);
    return {
      message: 'Account logout successfully',
    };
  }

  // get user
  async getUser(id: string): Promise<AuthResponse> {
    const user = await this.usersService.findById(id);
    if (!user || user.data.is_verified === false) {
      this.logger.error('Account not verified or not register');
      throw new BadRequestException('Account not verified or not register');
    }
    this.logger.log('Successfully get user');
    return {
      message: 'Successfully get user',
      data: {
        id: user.data.id,
        name: user.data.name,
        email: user.data.email,
        role_id: user.data.role?.id,
        is_verified: user.data.is_verified,
        role: {
          id: user.data.role?.id,
          name: user.data.role?.name,
          code: user.data.role?.code,
          level: user.data.role?.level,
          permissions: user.data.role?.permissions || [],
        },
      },
    };
  }

  // refresh token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Find the session in the database
    const session = await this.sessionRepository.findOne({
      where: { token: tokenHash },
      relations: ['user', 'user.role'],
    });

    if (!session) {
      this.logger.error(
        'Session not found (Potential Token Reuse or Invalid Token)',
        'RefreshToken',
      );
      throw new BadRequestException('Session not found');
    }

    // Check expiration
    if (session.expiresAt && new Date() > session.expiresAt) {
      await this.sessionRepository.remove(session);
      this.logger.error('Session expired', 'RefreshToken');
      throw new BadRequestException('Session expired');
    }

    const user = session.user;

    // Delete old session
    await this.sessionRepository.remove(session);

    // Generate new token
    const newToken = crypto.randomBytes(100).toString('hex').toUpperCase();
    const newTokenHash = crypto
      .createHash('sha256')
      .update(newToken)
      .digest('hex');

    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 24);

    // Save new session
    const newSession = this.sessionRepository.create({
      token: newTokenHash,
      user: {
        id: user.id,
      },
      expiresAt: newExpiresAt,
      ip: session.ip, // Preserve IP from old session
    });
    await this.sessionRepository.save(newSession);

    this.logger.log('Successfully refresh token');
    return {
      message: 'Successfully refresh token',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role?.id,
        is_verified: user.is_verified,
        session: newToken,
      },
    };
  }

  // forgot password
  async forgotPassword(email: string): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.error('User not found');
      throw new BadRequestException('User not found');
    }

    const tokens = crypto.randomBytes(40).toString('hex');

    const tokenVerify = `${tokens}-${Date.now()}`;
    user.verify_code = tokenVerify;
    user.verify_code_expires_at = new Date();
    user.verify_code_expires_at.setHours(
      user.verify_code_expires_at.getHours() + 24,
    );

    await this.userRepository.save(user);
    // send email for verification account
    try {
      const baseSite = (process.env.ADMIN_SITE || '').replace(/\/+$/, '');
      await this.emailService.sendMail(EmailType.RESET_PASSWORD, {
        links: `${baseSite}/reset-password?verify_token=${tokenVerify}`,
        email: user.email,
        subjectMessage: 'Reset password',
      });
    } catch (emailErr: any) {
      this.logger.error('Failed to send reset password email', emailErr);
    }

    this.logger.log('User resend verify account successfully', user.id);

    return {
      message: 'Account verified successfully, check your email',
    };
  }

  // reset password
  async resetPassword(
    token: string,
    resetDto: ResetPasswordDto,
  ): Promise<AuthResponse> {
    if (!token) {
      this.logger.error('Token not found');
      throw new BadRequestException('Token not found');
    }
    const user = await this.usersService.findByVerifyCode(token);
    if (!user) {
      this.logger.error('User not found');
      throw new BadRequestException('User not found');
    }

    user.password = resetDto.password;
    user.verify_code = null;
    user.verify_code_expires_at = null;

    await this.usersService.update(user.id, user);

    // send email for verification account
    try {
      await this.emailService.sendMail(EmailType.VERIFY_ACCOUNT, {
        links: null,
        email: user.email,
        subjectMessage: 'Success reset password',
      });
    } catch (emailErr: any) {
      this.logger.error('Failed to send reset password confirmation email', emailErr);
    }

    this.logger.log('User reset password successfully', user.id);

    return {
      message: 'User reset password successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_verified: user.is_verified,
        role_id: user.role.id,
      },
    };
  }
}
