import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsOptional()
  @IsString({ message: 'Book tour id must be a string' })
  book_tour_id?: string;

  @IsOptional()
  @IsString({ message: 'Book motor id must be a string' })
  book_motor_id?: string;

  @IsOptional()
  @IsString({ message: 'Book entertainment attraction id must be a string' })
  book_entertainment_attraction_id?: string;

  @IsOptional()
  @IsString({ message: 'Book document visa id must be a string' })
  book_document_visa_id?: string;

  @IsNotEmpty({ message: 'Payment method is required' })
  @IsEnum(PaymentMethod, { message: 'Payment method must be a string' })
  payment_method: PaymentMethod;

  @IsNotEmpty({ message: 'Currency is required' })
  @IsString({ message: 'Currency must be a string' })
  currency: string;

  // Optional: exchange rate from frontend (IDR to USD)
  exchange_rate?: number;
}
