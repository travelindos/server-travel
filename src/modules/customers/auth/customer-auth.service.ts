import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EmailService } from '../../../common/emails/emails.service';
import { EmailType } from '../../../types/email.type';
import { Repository } from 'typeorm';
import { CustomerLoginDto } from '../dto/customer-login.dto';
import { CustomerRegisterDto } from '../dto/customer-register.dto';
import { EmailRequestDto } from '../dto/email-request.dto';
import { CustomerResetPasswordDto } from '../dto/customer-reset-password.dto';
import { CustomerSession } from '../entities/customer-session.entity';
import { Customer } from '../entities/customer.entity';

@Injectable()
export class CustomerAuthService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly emailService: EmailService,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(CustomerSession)
    private readonly sessionRepository: Repository<CustomerSession>,
  ) {}

  // Customer Register
  async register(registerDto: CustomerRegisterDto): Promise<any> {
    const existingCustomer = await this.customerRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingCustomer) {
      throw new HttpException('Email already registered', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const tokens = crypto.randomBytes(40).toString('hex');
    const verifyCode = `${tokens}-${Date.now()}`;
    const verifyExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const customer = this.customerRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      is_verified: false,
      verify_code: verifyCode,
      verify_code_expires_at: verifyExpiresAt,
      profile: {},
    });

    await this.customerRepository.save(customer);

    const baseSite = (process.env.CLIENT_SITE || '').replace(/\/+$/, '');
    if (baseSite) {
      await this.emailService.sendMail(EmailType.VERIFY_ACCOUNT, {
        links: `${baseSite}/verify-account?verify_token=${verifyCode}`,
        email: customer.email,
        subjectMessage: 'Verify your customer account',
      });
    }

    return {
      message: 'Registration successful! Please check your email for verification.',
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        is_verified: customer.is_verified,
      },
    };
  }

  // Customer Verify Account
  async verifyAccount(token: string): Promise<any> {
    const customer = await this.customerRepository.findOne({
      where: { verify_code: token },
    });

    if (!customer) {
      throw new HttpException('Invalid verification token', HttpStatus.BAD_REQUEST);
    }

    if (customer.verify_code_expires_at && new Date() > customer.verify_code_expires_at) {
      throw new HttpException('Verification token has expired', HttpStatus.BAD_REQUEST);
    }

    if (customer.is_verified) {
      throw new HttpException('Account already verified', HttpStatus.BAD_REQUEST);
    }

    customer.is_verified = true;
    customer.verify_code = null;
    customer.verify_code_expires_at = null;

    await this.customerRepository.save(customer);

    return {
      message: 'Customer account verified successfully',
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        is_verified: customer.is_verified,
      },
    };
  }

  // Customer Login
  async login(loginDto: CustomerLoginDto, ip: string): Promise<any> {
    const customer = await this.customerRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!customer) {
      throw new HttpException('Invalid email or password', HttpStatus.BAD_REQUEST);
    }

    const isMatch = await bcrypt.compare(loginDto.password, customer.password);
    if (!isMatch) {
      throw new HttpException('Invalid email or password', HttpStatus.BAD_REQUEST);
    }

    if (!customer.is_verified) {
      throw new HttpException('Account not verified. Please check your email.', HttpStatus.FORBIDDEN);
    }

    // Generate access token (short-lived: 1 hour)
    const accessToken = crypto.randomBytes(64).toString('hex');
    const accessTokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Generate refresh token (long-lived: 7 days)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = this.sessionRepository.create({
      token: accessTokenHash,
      refresh_token: refreshTokenHash,
      customer: { id: customer.id } as any,
      ip,
      expiresAt: accessExpiresAt,
      refreshExpiresAt,
    });

    await this.sessionRepository.save(session);

    return {
      message: 'Login successful',
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        is_verified: customer.is_verified,
        avatar: customer.avatar,
        access_token: accessToken,
      },
      refresh_token: refreshToken,
    };
  }

  // Resend Verify Account
  async resendVerifyAccount(emailRequestDto: EmailRequestDto): Promise<any> {
    const customer = await this.customerRepository.findOne({
      where: { email: emailRequestDto.email },
    });

    if (!customer) {
      // Return success to prevent email enumeration
      return { message: 'If the email is registered, a verification link has been sent.' };
    }

    if (customer.is_verified) {
      throw new HttpException('Account already verified', HttpStatus.BAD_REQUEST);
    }

    const tokens = crypto.randomBytes(40).toString('hex');
    const verifyCode = `${tokens}-${Date.now()}`;
    const verifyExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    customer.verify_code = verifyCode;
    customer.verify_code_expires_at = verifyExpiresAt;
    await this.customerRepository.save(customer);

    const baseSite = (process.env.CLIENT_SITE || '').replace(/\/+$/, '');
    if (baseSite) {
      await this.emailService.sendMail(EmailType.VERIFY_ACCOUNT, {
        links: `${baseSite}/verify-account?verify_token=${verifyCode}`,
        email: customer.email,
        subjectMessage: 'Verify your customer account',
      });
    }

    return {
      message: 'If the email is registered, a verification link has been sent.',
    };
  }

  // Forgot Password
  async forgotPassword(emailRequestDto: EmailRequestDto): Promise<any> {
    const customer = await this.customerRepository.findOne({
      where: { email: emailRequestDto.email },
    });

    if (!customer) {
      // Return success even if not found to prevent email enumeration
      return { message: 'If the email is registered, a password reset link has been sent.' };
    }

    const tokens = crypto.randomBytes(40).toString('hex');
    const resetToken = `${tokens}-${Date.now()}`;
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    customer.reset_password_token = resetToken;
    customer.reset_password_expires_at = resetExpiresAt;
    await this.customerRepository.save(customer);

    const baseSite = (process.env.CLIENT_SITE || '').replace(/\/+$/, '');
    if (baseSite) {
      await this.emailService.sendMail(EmailType.RESET_PASSWORD, {
        links: `${baseSite}/reset-password?verify_code=${resetToken}`,
        email: customer.email,
        subjectMessage: 'Reset Customer Password',
      });
    }

    return {
      message: 'If the email is registered, a password reset link has been sent.',
    };
  }

  // Reset Password
  async resetPassword(
    resetPasswordDto: CustomerResetPasswordDto,
  ): Promise<any> {
    const tokenToSearch =
      resetPasswordDto.code ||
      (resetPasswordDto as any).verify_code ||
      (resetPasswordDto as any).token;

    if (!tokenToSearch) {
      throw new HttpException(
        'Invalid or missing verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    const customer = await this.customerRepository.findOne({
      where: { reset_password_token: tokenToSearch },
    });

    if (!customer) {
      throw new HttpException('Invalid or expired password reset token', HttpStatus.BAD_REQUEST);
    }

    if (customer.reset_password_expires_at && new Date() > customer.reset_password_expires_at) {
      throw new HttpException('Password reset token has expired', HttpStatus.BAD_REQUEST);
    }

    const passwordToHash = resetPasswordDto.new_password || (resetPasswordDto as any).newPassword;
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);
    
    customer.password = hashedPassword;
    customer.reset_password_token = null;
    customer.reset_password_expires_at = null;

    await this.customerRepository.save(customer);

    try {
      await this.emailService.sendMail(EmailType.SUCCESS_RESET_PASSWORD, {
        email: customer.email,
        subjectMessage: 'Your password was reset successfully',
      });
    } catch (emailErr: any) {
      this.logger.error('Failed to send password reset success email', emailErr);
    }

    return {
      message: 'Password reset successfully. Please log in with your new password.',
    };
  }

  // Get Profile
  async getProfile(customerId: string): Promise<any> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    }

    return {
      message: 'Profile retrieved successfully',
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone_number,
        is_verified: customer.is_verified,
        avatar: customer.avatar,
        created_at: customer.createdAt,
      },
    };
  }

  // Customer Logout
  async logout(accessToken: string): Promise<any> {
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    const session = await this.sessionRepository.findOne({
      where: { token: tokenHash },
    });

    if (session) {
      await this.sessionRepository.remove(session);
    }

    return { message: 'Logout successful' };
  }

  // Refresh Token — reads refresh_token hash from cookie session_customers
  async refreshToken(cookieRefreshToken: string, ip: string): Promise<any> {
    const refreshTokenHash = crypto.createHash('sha256').update(cookieRefreshToken).digest('hex');
    const session = await this.sessionRepository.findOne({
      where: { refresh_token: refreshTokenHash },
      relations: ['customer'],
    });

    if (!session || (session.refreshExpiresAt && new Date() > session.refreshExpiresAt)) {
      throw new HttpException('Invalid or expired session. Please log in again.', HttpStatus.UNAUTHORIZED);
    }

    const customer = session.customer;

    // Rotate: delete old session and create new one
    await this.sessionRepository.remove(session);

    const newAccessToken = crypto.randomBytes(64).toString('hex');
    const newAccessTokenHash = crypto.createHash('sha256').update(newAccessToken).digest('hex');
    const newAccessExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const newRefreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newSession = this.sessionRepository.create({
      token: newAccessTokenHash,
      refresh_token: newRefreshTokenHash,
      customer: { id: customer.id } as any,
      ip,
      expiresAt: newAccessExpiresAt,
      refreshExpiresAt: newRefreshExpiresAt,
    });

    await this.sessionRepository.save(newSession);

    return {
      message: 'Token refreshed successfully',
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        access_token: newAccessToken,
      },
      refresh_token: newRefreshToken, // will be rotated in cookie by controller
    };
  }

  // Admin Methods for Customer Management
  async findAllCustomersForAdmin(): Promise<any[]> {
    const customers = await this.customerRepository.find({
      relations: ['profile', 'bookers', 'itineraries'],
      order: { createdAt: 'DESC' },
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone_number: c.phone_number,
      is_verified: c.is_verified,
      profile: c.profile || {},
      bookersCount: c.bookers?.length || 0,
      itinerariesCount: c.itineraries?.length || 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async findCustomerByIdForAdmin(id: string): Promise<any> {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['profile', 'bookers', 'itineraries'],
    });

    if (!customer) {
      throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone_number: customer.phone_number,
      is_verified: customer.is_verified,
      profile: customer.profile || {},
      bookers: customer.bookers || [],
      itineraries: customer.itineraries || [],
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  async toggleVerifyCustomer(id: string): Promise<any> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    }

    customer.is_verified = !customer.is_verified;
    await this.customerRepository.save(customer);

    return {
      id: customer.id,
      is_verified: customer.is_verified,
    };
  }

  async deleteCustomerForAdmin(id: string): Promise<any> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    }

    await this.customerRepository.softDelete(id);
    return {
      message: 'Customer deleted successfully',
    };
  }
}
