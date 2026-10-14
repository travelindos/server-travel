import { StatusBookMotor } from '../../modules/book-motors/entities/book-motor.entity';
import { ResponseModel } from './response.type';

export class BookMotorItemData {
  id: string;
  motor_id: string;
  price: number;
  qty: number;
  subtotal: number;
}

export class BookMotorTouristData {
  id: string;
  name: string;
  passport_number: string;
  phone_number?: string;
}

export class BookingAddOnData {
  id: string;
  add_on_id: string;
  name: string;
  price: number;
}

export class BookMotorData {
  id: string;
  customer_id?: string;
  booker_id?: string;
  booker?: {
    id: string;
    name: string;
    email: string;
    phone_number: string;
  } | null;
  user_id?: string;
  start_date: Date;
  end_date: Date;
  expired_at?: Date;
  total_price: number;
  status: StatusBookMotor;
  notes?: string | null;
  note?: string | null;
  book_motor_items: BookMotorItemData[];
  tourists: BookMotorTouristData[];
  booking_add_ons: BookingAddOnData[];
  created_at: Date;
  updated_at: Date;
}

export class BookMotorResponse extends ResponseModel<BookMotorData> {
  message: string;
  data?: BookMotorData;
  datas?: BookMotorData[];
}
