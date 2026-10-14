import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentCustomer } from '../../../common/decorators/customer.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentToken } from '../../../common/decorators/user.decorator';
import { CustomerAuthGuard } from '../../../common/middlewares/customer-auth.guard';
import { WebResponse } from '../../../types/response/response.type';
import { CustomerLoginDto } from '../dto/customer-login.dto';
import { CustomerRegisterDto } from '../dto/customer-register.dto';
import { EmailRequestDto } from '../dto/email-request.dto';
import { CustomerResetPasswordDto } from '../dto/customer-reset-password.dto';
import { CustomerAuthService } from './customer-auth.service';

@Controller('customers')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: CustomerRegisterDto,
  ): Promise<WebResponse> {
    const response = await this.customerAuthService.register(registerDto);
    return {
      message: response.message,
      data: response.data,
    };
  }

  @Public()
  @Post('verify-account')
  @HttpCode(HttpStatus.OK)
  async verifyAccount(
    @Query('verify_code') verify_code: string,
  ): Promise<WebResponse> {
    const response = await this.customerAuthService.verifyAccount(verify_code);
    return {
      message: response.message,
      data: response.data,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: CustomerLoginDto,
    @Res() res: Response,
    @Ip() ip: string,
  ): Promise<any> {
    const response = await this.customerAuthService.login(loginDto, ip);

    // Set refresh token as httpOnly secure cookie
    res.cookie('session_customers', response.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
      path: '/',
    });

    res.status(HttpStatus.OK).json({
      message: response.message,
      data: response.data, // only contains: id, name, email, phone_number, is_verified, avatar, access_token
    });
  }

  @Get('me')
  @UseGuards(CustomerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentCustomer() customer: any): Promise<WebResponse> {
    const response = await this.customerAuthService.getProfile(customer.id);
    return {
      message: response.message,
      data: response.data,
    };
  }

  @Post('logout')
  @UseGuards(CustomerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentToken() token: string,
    @Res() res: Response,
  ): Promise<any> {
    const response = await this.customerAuthService.logout(token);

    // Clear the refresh token cookie
    res.clearCookie('session_customers', { path: '/', httpOnly: true, secure: true });
    res.status(HttpStatus.OK).json({ message: response.message });
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res() res: Response,
    @Ip() ip: string,
  ): Promise<any> {
    const cookieToken: string = req.cookies?.['session_customers'];
    if (!cookieToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Session not found. Please log in again.',
      });
    }

    const response = await this.customerAuthService.refreshToken(cookieToken, ip);

    // Rotate: set new refresh token cookie
    res.cookie('session_customers', response.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(HttpStatus.OK).json({
      message: response.message,
      data: response.data, // only contains: id, name, email, access_token
    });
  }

  @Public()
  @Post('resend-verify-account')
  @HttpCode(HttpStatus.OK)
  async resendVerify(
    @Body() emailRequestDto: EmailRequestDto,
  ): Promise<WebResponse> {
    const response = await this.customerAuthService.resendVerifyAccount(emailRequestDto);
    return {
      message: response.message,
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() emailRequestDto: EmailRequestDto,
  ): Promise<WebResponse> {
    const response = await this.customerAuthService.forgotPassword(emailRequestDto);
    return {
      message: response.message,
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Query('verify_code') queryVerifyCode: string,
    @Body() resetPasswordDto: CustomerResetPasswordDto,
  ): Promise<WebResponse> {
    if (queryVerifyCode) {
      resetPasswordDto.code = queryVerifyCode;
    }
    const response = await this.customerAuthService.resetPassword(resetPasswordDto);
    return {
      message: response.message,
    };
  }

  // Admin Endpoints for Customer Management
  @Public() // Or Protected by AuthGuard
  @Get('admin/list')
  @HttpCode(HttpStatus.OK)
  async findAllForAdmin(): Promise<WebResponse> {
    const data = await this.customerAuthService.findAllCustomersForAdmin();
    return {
      message: 'Find all customers successfully',
      data,
    };
  }

  @Public()
  @Get('admin/:id')
  @HttpCode(HttpStatus.OK)
  async findOneForAdmin(@Param('id') id: string): Promise<WebResponse> {
    const data = await this.customerAuthService.findCustomerByIdForAdmin(id);
    return {
      message: 'Find customer details successfully',
      data,
    };
  }

  @Public()
  @Post('admin/:id/toggle-verify')
  @HttpCode(HttpStatus.OK)
  async toggleVerify(@Param('id') id: string): Promise<WebResponse> {
    const data = await this.customerAuthService.toggleVerifyCustomer(id);
    return {
      message: 'Customer verification status updated',
      data,
    };
  }

  @Public()
  @Post('admin/:id/delete')
  @HttpCode(HttpStatus.OK)
  async removeCustomer(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.customerAuthService.deleteCustomerForAdmin(id);
    return {
      message: result.message,
    };
  }
}
