import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import {
  EmailType,
  SendMailOptions,
  SendMailOrdersOptions,
} from '../../types/email.type';

@Injectable()
export class EmailService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
  ) {}
  private transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  } as SMTPTransport.Options);

  async sendMail(type: EmailType, options: SendMailOptions) {
    const { email, links = '', subjectMessage } = options;

    let subject = '';
    let htmlContent = '';

    switch (type) {
      case EmailType.VERIFY_ACCOUNT:
        subject = subjectMessage || 'Verify your customer account - Pacific Travel Indo';
        htmlContent = this.generateVerifyAccountTemplate(links);
        break;

      case EmailType.RESET_PASSWORD:
        subject = subjectMessage || 'Reset your password - Pacific Travel Indo';
        htmlContent = this.generateResetPasswordTemplate(links);
        break;

      case EmailType.SUCCESS_RESET_PASSWORD:
        subject = subjectMessage || 'Your password was reset successfully - Pacific Travel Indo';
        htmlContent = this.generateSuccessResetPasswordTemplate(email);
        break;

      default:
        this.logger.error('Invalid email type');
        throw new Error('Invalid email type');
    }

    const mailOptions = {
      from: `Pacific Travel Indo <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject,
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.debug(`Email sent to ${email} - Type: ${type}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw new HttpException(
        `Failed to send email: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ─── Shared Modern Email Layout ─────────────────────────────────────────────
  private buildEmailWrapper(content: string, previewText: string = ''): string {
    const year = new Date().getFullYear();
    const loginUrl = process.env.CLIENT_SITE
      ? `${process.env.CLIENT_SITE.replace(/\/+$/, '')}/login`
      : 'https://pacifictravelindo.com/login';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pacific Travel Indo</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F1F5F9;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #1E293B;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #F1F5F9;
      padding: 40px 0;
    }
    .main-table {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 76, 129, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    }
    .header-banner {
      background: linear-gradient(135deg, #0A2540 0%, #0F4C81 100%);
      padding: 36px 30px;
      text-align: center;
      position: relative;
    }
    .brand-logo-text {
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 0;
      text-transform: uppercase;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .brand-orange {
      color: #F67F00;
    }
    .brand-tagline {
      color: #94A3B8;
      font-size: 13px;
      font-weight: 500;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .orange-divider {
      height: 4px;
      background: linear-gradient(90deg, #F67F00 0%, #FF9F2D 100%);
    }
    .content-body {
      padding: 40px 36px;
    }
    .badge-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px auto;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 64px;
      font-size: 28px;
    }
    .badge-orange {
      background-color: #FFF4E5;
      color: #F67F00;
    }
    .badge-blue {
      background-color: #E0F2FE;
      color: #0F4C81;
    }
    .badge-green {
      background-color: #DCFCE7;
      color: #16A34A;
    }
    h1 {
      color: #0F2942;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 12px 0;
      text-align: center;
    }
    p {
      color: #475569;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn-primary {
      background: linear-gradient(135deg, #F67F00 0%, #E07200 100%);
      color: #FFFFFF !important;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      padding: 16px 36px;
      border-radius: 12px;
      display: inline-block;
      box-shadow: 0 4px 14px rgba(246, 127, 0, 0.35);
      transition: all 0.2s ease;
    }
    .btn-blue {
      background: linear-gradient(135deg, #0F4C81 0%, #0A3459 100%);
      color: #FFFFFF !important;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      padding: 16px 36px;
      border-radius: 12px;
      display: inline-block;
      box-shadow: 0 4px 14px rgba(15, 76, 129, 0.35);
    }
    .info-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .info-card p {
      margin: 0;
      font-size: 13px;
      color: #64748B;
    }
    .link-box {
      word-break: break-all;
      font-size: 12px;
      color: #0F4C81;
      background-color: #F1F5F9;
      padding: 10px 14px;
      border-radius: 8px;
      margin-top: 8px;
      display: block;
      font-family: monospace;
    }
    .expiry-alert {
      display: flex;
      align-items: center;
      background-color: #FFF7ED;
      border-left: 4px solid #F67F00;
      padding: 12px 16px;
      border-radius: 6px;
      margin-top: 20px;
    }
    .expiry-alert p {
      margin: 0;
      font-size: 13px;
      color: #9A3412;
      font-weight: 500;
    }
    .footer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 28px 36px;
      text-align: center;
    }
    .footer-text {
      color: #94A3B8;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }
    .footer-links a {
      color: #0F4C81;
      text-decoration: none;
      margin: 0 8px;
      font-size: 12px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-table" width="100%" cellpadding="0" cellspacing="0">
      <!-- Header Banner -->
      <tr>
        <td class="header-banner">
          <div class="brand-logo-text">PACIFIC <span class="brand-orange">TRAVEL</span> INDO</div>
          <div class="brand-tagline">YOUR TRUSTED TRAVEL PARTNER</div>
        </td>
      </tr>
      <tr>
        <td class="orange-divider"></td>
      </tr>
      <!-- Body Content -->
      <tr>
        <td class="content-body">
          ${content}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td class="footer">
          <p class="footer-links" style="margin-bottom: 12px;">
            <a href="${loginUrl}">Login</a> • 
            <a href="https://pacifictravelindo.com">Website</a> • 
            <a href="mailto:info@pacifictravelindo.com">Support</a>
          </p>
          <p class="footer-text">
            © ${year} Pacific Travel Indo. All rights reserved.<br/>
            This is an automated email notification, please do not reply directly to this message.
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
    `;
  }

  // ─── 1. Template Email Verification ──────────────────────────────────────────
  private generateVerifyAccountTemplate(link: string): string {
    const content = `
      <div class="badge-icon badge-orange">✉️</div>
      <h1>Verify Your Email Address</h1>
      <p style="text-align: center;">
        Welcome to <strong>Pacific Travel Indo</strong>! We're excited to have you on board.
        Please verify your email address to activate your account and start booking your dream tours.
      </p>
      
      <div class="btn-container">
        <a href="${link}" class="btn-primary" target="_blank">Verify My Account</a>
      </div>

      <div class="expiry-alert">
        <p>⏱️ <strong>Security Note:</strong> This verification link will expire in <strong>60 minutes</strong>.</p>
      </div>
    `;

    return this.buildEmailWrapper(content, 'Verify your email address for Pacific Travel Indo');
  }

  // ─── 2. Template Reset Password ──────────────────────────────────────────────
  private generateResetPasswordTemplate(link: string): string {
    const content = `
      <div class="badge-icon badge-blue">🔐</div>
      <h1>Password Reset Request</h1>
      <p style="text-align: center;">
        We received a request to reset the password for your <strong>Pacific Travel Indo</strong> account.
        Click the button below to set a new password.
      </p>
      
      <div class="btn-container">
        <a href="${link}" class="btn-primary" target="_blank">Reset Password</a>
      </div>

      <div class="expiry-alert">
        <p>⏱️ <strong>Notice:</strong> This password reset link is valid for <strong>60 minutes</strong>.</p>
      </div>
    `;

    return this.buildEmailWrapper(content, 'Reset your password for Pacific Travel Indo');
  }

  // ─── 3. Template Success Reset Password ──────────────────────────────────────
  private generateSuccessResetPasswordTemplate(email: string): string {
    const loginUrl = process.env.CLIENT_SITE
      ? `${process.env.CLIENT_SITE.replace(/\/+$/, '')}/login`
      : 'https://pacifictravelindo.com/login';

    const content = `
      <div class="badge-icon badge-green">✅</div>
      <h1>Password Reset Successful</h1>
      <p style="text-align: center;">
        Your password for <strong>${email}</strong> has been updated successfully.
        You can now log in to your account using your new password.
      </p>
      
      <div class="btn-container">
        <a href="${loginUrl}" class="btn-blue" target="_blank">Log In to Your Account</a>
      </div>

      <div class="info-card" style="border-left: 4px solid #EF4444; background-color: #FEF2F2;">
        <p style="color: #991B1B;">
          🔒 <strong>Security Warning:</strong> If you did not make this change, please contact our support team immediately at 
          <a href="mailto:info@pacifictravelindo.com" style="color: #991B1B; font-weight: bold;">info@pacifictravelindo.com</a> to secure your account.
        </p>
      </div>
    `;

    return this.buildEmailWrapper(content, 'Your Pacific Travel Indo password has been updated');
  }

  /**
   * Send order-related emails (booking confirmation, payment status)
   * Uses switch case to handle different email types
   */
  async sendOrderEmail(type: EmailType, options: SendMailOrdersOptions) {
    let customerSubject = '';
    let customerHtml = '';
    let adminSubject = '';
    let adminHtml = '';

    // Generate email content based on type
    switch (type) {
      case EmailType.SUCCESS_BOOKING:
        customerSubject = `Konfirmasi Pesanan Anda - ${options.orderCode}`;
        customerHtml = this.generateCustomerBookingEmail(options);
        adminSubject = `Pesanan Baru Diterima - ${options.orderCode}`;
        adminHtml = this.generateAdminBookingEmail(options);
        break;

      case EmailType.SUCCESS_PAYMENT:
        customerSubject = `Pembayaran Berhasil - ${options.orderCode}`;
        customerHtml = this.generateCustomerPaymentEmail(options);
        adminSubject = `Status Pembayaran - ${options.orderCode}`;
        adminHtml = this.generateAdminPaymentEmail(options);
        break;

      default:
        this.logger.error(`Invalid order email type: ${type}`);
        throw new Error(`Invalid order email type: ${type}`);
    }

    try {
      // Send email to customer
      await this.sendToCustomer(options.email, customerSubject, customerHtml);

      // Send email to admin
      await this.sendToAdmin(adminSubject, adminHtml);

      this.logger.debug(
        `Order email sent successfully - Type: ${type}, Order: ${options.orderCode}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to send order email: ${error.message}`);
      throw new HttpException(
        `Failed to send order email: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send email to customer
   */
  private async sendToCustomer(
    email: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const mailOptions = {
      from: `Pacific Travel Indo <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject,
      html,
    };

    await this.transporter.sendMail(mailOptions);
    this.logger.debug(`Email sent to customer: ${email}`);
  }

  /**
   * Send email to admin (owner + admin emails)
   */
  private async sendToAdmin(subject: string, html: string): Promise<void> {
    const ownerEmail = process.env.OWNER_EMAIL;
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];

    const mailOptions = {
      from: `Pacific Travel Indo <${process.env.EMAIL_USERNAME}>`,
      to: ownerEmail,
      cc: adminEmails.filter(Boolean).join(','),
      subject,
      html,
    };

    await this.transporter.sendMail(mailOptions);
    this.logger.debug(
      `Email sent to admin - Owner: ${ownerEmail}, CC: ${adminEmails.join(', ')}`,
    );
  }

  /**
   * Generate customer booking confirmation email
   */
  private generateCustomerBookingEmail(options: SendMailOrdersOptions): string {
    // Determine currency display
    const currency = options.currency?.toUpperCase() || 'IDR';
    const isPayPal = options.paymentMethod?.toLowerCase().includes('paypal');

    // Format amount display
    let amountDisplay = '';
    if (isPayPal && options.totalAmountUSD && currency !== 'USD') {
      // Show both currencies for PayPal
      amountDisplay = `
        <p><strong>Total: Rp ${options.totalAmount?.toLocaleString('id-ID') || 0}</strong></p>
        <p style="color: #666; font-size: 14px;">≈ USD $ ${options.totalAmountUSD?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</p>
        ${options.exchangeRate ? `<p style="color: #999; font-size: 12px;">Exchange rate: 1 USD = Rp ${options.exchangeRate.toLocaleString('id-ID')}</p>` : ''}
      `;
    } else if (currency === 'USD') {
      amountDisplay = `<p><strong>Total: $ ${options.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</strong></p>`;
    } else {
      amountDisplay = `<p><strong>Total: Rp ${options.totalAmount?.toLocaleString('id-ID') || 0}</strong></p>`;
    }

    const content = `
      <div class="badge-icon badge-orange">📋</div>
      <h1>Konfirmasi Pesanan Anda</h1>
      <p style="text-align: center;">
        Hai <strong>${options.email}</strong>, terima kasih telah memesan paket tur di <strong>Pacific Travel Indo</strong>.
        Pesanan Anda dengan kode <strong>${options.orderCode}</strong> telah kami terima.
      </p>

      <div class="info-card">
        <h3 style="margin-top: 0; color: #0F4C81;">Detail Pesanan:</h3>
        <div>${options.orderDetails}</div>
        <div style="margin-top: 12px;">${amountDisplay}</div>
        <p><strong>Metode Pembayaran:</strong> ${options.paymentMethod}</p>
      </div>

      <div class="btn-container">
        ${options.links ? `<a href="${options.links}" class="btn-primary" target="_blank">Lanjutkan Pembayaran</a>` : ''}
      </div>
    `;

    return this.buildEmailWrapper(content);
  }

  /**
   * Generate admin booking notification email
   */
  private generateAdminBookingEmail(options: SendMailOrdersOptions): string {
    // Determine currency display
    const currency = options.currency?.toUpperCase() || 'IDR';
    const isPayPal = options.paymentMethod?.toLowerCase().includes('paypal');

    // Format amount display
    let amountDisplay = '';
    if (isPayPal && options.totalAmountUSD && currency !== 'USD') {
      amountDisplay = `
        <li><strong>Total (IDR):</strong> Rp ${options.totalAmount?.toLocaleString('id-ID') || 0}</li>
        <li><strong>Total (USD):</strong> $ ${options.totalAmountUSD?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</li>
        ${options.exchangeRate ? `<li><strong>Exchange Rate:</strong> 1 USD = Rp ${options.exchangeRate.toLocaleString('id-ID')}</li>` : ''}
      `;
    } else if (currency === 'USD') {
      amountDisplay = `<li><strong>Total Bayar:</strong> $ ${options.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</li>`;
    } else {
      amountDisplay = `<li><strong>Total Bayar:</strong> Rp ${options.totalAmount?.toLocaleString('id-ID') || 0}</li>`;
    }

    const content = `
      <div class="badge-icon badge-orange">🔔</div>
      <h1>Pesanan Baru Diterima</h1>
      <div class="info-card">
        <ul style="margin: 0; padding-left: 20px; color: #334155;">
          <li><strong>Kode Pesanan:</strong> ${options.orderCode}</li>
          <li><strong>Email Pelanggan:</strong> ${options.email}</li>
          ${amountDisplay}
          <li><strong>Metode Pembayaran:</strong> ${options.paymentMethod}</li>
        </ul>
        <h4 style="color: #0F4C81; margin-top: 16px; margin-bottom: 8px;">Detail Pemesanan:</h4>
        <div>${options.orderDetails}</div>
      </div>
    `;

    return this.buildEmailWrapper(content);
  }

  /**
   * Generate customer payment success email
   */
  private generateCustomerPaymentEmail(options: SendMailOrdersOptions): string {
    // Determine currency display
    const currency = options.currency?.toUpperCase() || 'IDR';
    const isPayPal = options.paymentMethod?.toLowerCase().includes('paypal');

    // Format amount display
    let amountDisplay = '';
    if (isPayPal && options.totalAmountUSD && currency !== 'USD') {
      amountDisplay = `
        <p><strong>Total Dibayar (IDR): Rp ${options.totalAmount?.toLocaleString('id-ID') || 0}</strong></p>
        <p><strong>Dibayar via PayPal (USD): $ ${options.totalAmountUSD?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</strong></p>
        ${options.exchangeRate ? `<p style="color: #666; font-size: 12px;">Exchange rate: 1 USD = Rp ${options.exchangeRate.toLocaleString('id-ID')}</p>` : ''}
      `;
    } else if (currency === 'USD') {
      amountDisplay = `<p><strong>Total Dibayar: $ ${options.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</strong></p>`;
    } else {
      amountDisplay = `<p><strong>Total Dibayar: Rp ${options.totalAmount?.toLocaleString('id-ID') || 0}</strong></p>`;
    }

    const content = `
      <div class="badge-icon badge-green">🎉</div>
      <h1>Pembayaran Berhasil!</h1>
      <p style="text-align: center;">
        Hai <strong>${options.email}</strong>, pembayaran Anda untuk pesanan <strong>${options.orderCode}</strong> telah berhasil diproses.
      </p>

      <div class="info-card" style="border-left: 4px solid #16A34A; background-color: #F0FDF4;">
        <h3 style="margin-top: 0; color: #166534;">Detail Pembayaran:</h3>
        <div>${options.orderDetails}</div>
        <div style="margin-top: 12px;">${amountDisplay}</div>
        <p style="color: #16A34A; font-weight: bold; margin-bottom: 0;">Status: Pembayaran Lunas ✓</p>
      </div>
    `;

    return this.buildEmailWrapper(content);
  }

  /**
   * Generate admin payment notification email
   */
  private generateAdminPaymentEmail(options: SendMailOrdersOptions): string {
    // Determine currency display
    const currency = options.currency?.toUpperCase() || 'IDR';
    const isPayPal = options.paymentMethod?.toLowerCase().includes('paypal');

    // Format amount display
    let amountDisplay = '';
    if (isPayPal && options.totalAmountUSD && currency !== 'USD') {
      amountDisplay = `
        <li><strong>Total (IDR):</strong> Rp ${options.totalAmount?.toLocaleString('id-ID') || 0}</li>
        <li><strong>Dibayar (USD):</strong> $ ${options.totalAmountUSD?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</li>
        ${options.exchangeRate ? `<li><strong>Exchange Rate:</strong> 1 USD = Rp ${options.exchangeRate.toLocaleString('id-ID')}</li>` : ''}
      `;
    } else if (currency === 'USD') {
      amountDisplay = `<li><strong>Total Dibayar:</strong> $ ${options.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}</li>`;
    } else {
      amountDisplay = `<li><strong>Total Dibayar:</strong> Rp ${options.totalAmount?.toLocaleString('id-ID') || 0}</li>`;
    }

    const content = `
      <div class="badge-icon badge-green">💰</div>
      <h1>Pembayaran Diterima</h1>
      <div class="info-card">
        <ul style="margin: 0; padding-left: 20px; color: #334155;">
          <li><strong>Kode Pesanan:</strong> ${options.orderCode}</li>
          <li><strong>Email Pelanggan:</strong> ${options.email}</li>
          ${amountDisplay}
          <li><strong>Metode Pembayaran:</strong> ${options.paymentMethod}</li>
        </ul>
        <p style="color: #16A34A; font-weight: bold; margin-top: 12px;">Status: Pembayaran Berhasil ✓</p>
        <h4 style="color: #0F4C81; margin-top: 16px; margin-bottom: 8px;">Detail Pemesanan:</h4>
        <div>${options.orderDetails}</div>
      </div>
    `;

    return this.buildEmailWrapper(content);
  }
}
