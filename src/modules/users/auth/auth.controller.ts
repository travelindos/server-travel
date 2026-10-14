import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import {
  CurrentToken,
  CurrentUser,
} from '../../../common/decorators/user.decorator';
import { WebResponse } from '../../../types/response/response.type';
import { EmailReqDto } from '../dto/email_req.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset_password.dto';
import { AuthService } from './auth.service';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // register
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<WebResponse> {
    const response = await this.authService.register(registerDto);
    return {
      message: response.message,
      data: response.data,
    };
  }

  // verify account
  @Public()
  @Post('verify-account')
  @HttpCode(HttpStatus.OK)
  async verifyAccount(
    @Query('verify_token') queryToken?: string,
    @Query('verify_code') queryCode?: string,
    @Body('verify_token') bodyToken?: string,
    @Body('verify_code') bodyCode?: string,
  ): Promise<WebResponse> {
    const token = queryToken || queryCode || bodyToken || bodyCode || '';
    const response = await this.authService.verifyAccount(token);
    return {
      message: response.message,
      data: response.data,
    };
  }

  // resend verify account
  @Public()
  @Post('resend-verify')
  @HttpCode(HttpStatus.OK)
  async resendVerifyAccount(@Body() reqDto: EmailReqDto): Promise<WebResponse> {
    const response = await this.authService.resendVerifyAccount(reqDto);
    return {
      message: response.message,
    };
  }

  // login user
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
    @Ip() ip: string,
  ): Promise<any> {
    const response = await this.authService.login(loginDto, ip);
    res.setHeader('Authorization', `Bearer ${response.data.session}`);
    res.status(200).json({
      message: response.message,
      data: response.data,
    });
  }

  // get user
  @Get('get-user')
  @HttpCode(HttpStatus.OK)
  async getUser(@CurrentUser() user: any): Promise<WebResponse> {
    const response = await this.authService.getUser(user.id);
    return {
      message: response.message,
      data: response.data,
    };
  }

  // logout user
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentToken() token: string): Promise<WebResponse> {
    const response = await this.authService.logout(token);
    return {
      message: response.message,
    };
  }

  // refresh token
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @CurrentToken() token: string,
    @Res() res: Response,
  ): Promise<any> {
    const response = await this.authService.refreshToken(token);
    res.setHeader('Authorization', `Bearer ${response.data.session}`);
    res.status(200).json({
      message: response.message,
      data: response.data,
    });
  }

  // forgot password
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() resetDto: EmailReqDto): Promise<WebResponse> {
    const response = await this.authService.forgotPassword(resetDto.email);
    return {
      message: response.message,
    };
  }

  // reset password
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Query('verify_code') verify_token: string,
    @Body() resetDto: ResetPasswordDto,
  ): Promise<WebResponse> {
    const response = await this.authService.resetPassword(verify_token,resetDto);
    return {
      message: response.message,
    };
  }
}
