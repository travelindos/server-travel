import { ResponseModel } from './response.type';

export class PaymentData {
  id: string;
  customer_id?: string;
  customer?: any; // Customer details object
  user?: any; // User details object
  book_tour_id?: string;
  book_tour?: any; // BookTour details with items and tourists
  book_motor_id?: string;
  book_motor?: any; // BookMotor details
  book_entertainment_attraction_id?: string;
  book_entertainment_attraction?: any; // BookEntertainmentAttraction details
  book_document_visa_id?: string;
  book_document_visa?: any; // BookDocumentVisa details
  total_tourists?: number;
  invoice_code?: string;
  amount: number;
  currency: string;
  service_type?: string;
  transaction_id?: string;
  payment_method: string;
  payer_email?: string;
  redirect_url?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export class PaymentResponse extends ResponseModel<PaymentData> {
  message: string;
  data?: PaymentData;
  datas?: PaymentData[];
}
