import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class PaypalService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  async authPaypal() {
    try {
      const authResponse = await fetch(
        `${process.env.PAYPAL_API}/v1/oauth2/token`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`,
            ).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        },
      );

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        throw new Error(`PayPal Auth Error: ${errorText}`);
      }

      const authData = await authResponse.json();
      const accessToken = authData.access_token;

      return accessToken;
    } catch (error: any) {
      this.logger.error('Failed to auth paypal');
      if (error instanceof Error) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to auth paypal',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // capture payment
   async capturePayment(transactionId: string) {
    try {
      const accessToken = await this.authPaypal();
      const captureResponse = await fetch(
        `${process.env.PAYPAL_API}/v2/checkout/orders/${transactionId}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const captureData = await captureResponse.json();


      // Jika response error dari PayPal
      if (!captureResponse.ok) {
        const issue = captureData?.details?.[0]?.issue;
        const description = captureData?.details?.[0]?.description || captureData?.message;

        // Tangani jika order sudah pernah di-capture sebelumnya
        if (
          issue === 'ORDER_ALREADY_CAPTURED' ||
          description?.toLowerCase()?.includes('already captured')
        ) {
          this.logger.warn(`PayPal order ${transactionId} was already captured`);
          return {
            payerEmail: captureData?.payer?.email_address || null,
            status: 'COMPLETED',
            raw: captureData,
            alreadyCaptured: true,
          };
        }

        // Khusus: tangani error ketika sudah terlalu banyak mencoba
        if (issue === 'MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED') {
          throw new Error(
            'This order has already been attempted too many times. Please create a new order to try again.',
          );
        }

        throw new Error(`PayPal API error: ${description}`);
      }

      if (captureData.status !== 'COMPLETED') {
        throw new Error(`Payment not completed, status: ${captureData.status}`);
      }

      const payerEmail = captureData.payer?.email_address || null;

      return {
        payerEmail,
        status: captureData.status,
        raw: captureData,
      };
    } catch (error: any) {
      this.logger.error('Failed to capture payment');
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message || 'Failed to capture payment', HttpStatus.BAD_REQUEST);
    }
  }
}
