export enum EmailType {
  VERIFY_ACCOUNT = 'verifyAccount',
  GENERATE_NEW_OTP = 'generateNewOtp',
  VERIFY_OTP = 'verifyOtp',
  RESET_PASSWORD = 'resetPassword',
  SUCCESS_RESET_PASSWORD = 'successResetPassword',
  SUCCESS_BOOKING = 'successBooking',
  SUCCESS_PAYMENT = 'successPayment',
}

export class SendMailOptions {
  email: string;
  otpCode?: string;
  links?: string;
  subjectMessage?: string;
  webhookInfo?: string;
}

export class SendMailOrdersOptions {
  email: string;
  links?: string;
  orderDetails: any;
  totalAmount?: number;
  totalAmountUSD?: number; // Amount in USD (for PayPal)
  currency?: string; // Original currency (IDR, USD, etc)
  exchangeRate?: number; // Exchange rate used
  paymentMethod?: string;
  orderCode: string;
  subjectMessage?: string;
  webhookInfo?: string;
}
