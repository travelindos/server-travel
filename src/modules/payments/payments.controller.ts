import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Idempotent } from '../../common/idempotency/decorators/idempotent.decorator';
import { PaymentResponse } from '../../types/response/payment.type';
import { WebResponse } from '../../types/response/response.type';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // POST /payments (Create Payment - Customer or User)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Idempotent()
  async create(
    @Req() req: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    const userId = req.customer?.id || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required to create payment');
    }
    const result = await this.paymentsService.createPayment(
      userId,
      createPaymentDto,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // POST /payments/:orderId/capture (Capture Paypal Payment)
  @Public()
  @Post(':orderId/capture')
  @HttpCode(HttpStatus.OK)
  async capture(@Param('orderId') orderId: string): Promise<PaymentResponse> {
    const result = await this.paymentsService.capturePayment(orderId);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // POST /payments/webhook (Paypal Webhook)
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() payload: any): Promise<WebResponse> {
    const result = await this.paymentsService.handleWebhook(payload);
    return {
      message: result.message || 'Webhook received',
    };
  }

  // GET /payments (Find All Payments for Current Customer/User)
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Req() req: any): Promise<WebResponse> {
    const userId = req.customer?.id || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const result = await this.paymentsService.findAllPayments(userId);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // GET /payments/admin (Find All Payments for Admin)
  @Permissions('payments:read')
  @Get('admin')
  @HttpCode(HttpStatus.OK)
  async findAllPaymentUser(): Promise<WebResponse> {
    const result = await this.paymentsService.findAllPaymentUsers();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // GET /payments/:id (Find Payment Detail by ID)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.paymentsService.findOnePayment(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // PATCH /payments/:orderId/cancel (Cancel Payment)
  @Patch(':orderId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Req() req: any,
    @Param('orderId') orderId: string,
  ): Promise<PaymentResponse> {
    const userId = req.customer?.id || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const result = await this.paymentsService.cancelPayment(userId, orderId);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // DELETE /payments/:id (Delete Payment - Admin)
  @Permissions('payments:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.paymentsService.remove(id);
    return {
      message: result.message,
    };
  }
}
