import { StatusBookEntertainmentAttraction } from '../../modules/book-entertainment-attractions/entities/book-entertainment-attraction.entity';
import { AgeGroup } from '../../modules/tourists/entities/tourist.entity';
import { ResponseModel } from './response.type';

export class BookEntertainmentAttractionItemData {
  id: string;
  entertainment_attraction_id?: string;
  entertainment_attraction_name?: string;
  ticket_id?: string;
  ticket_name?: string;
  unit_price: number;
  qty: number;
  subtotal: number;
}

export class BookEntertainmentAttractionTouristData {
  id: string;
  name: string;
  gender: string;
  passport_number: string;
  phone_number?: string;
  nationality: string;
  birth_date?: Date;
  age_group?: AgeGroup;
}

export class BookEntertainmentAttractionData {
  id: string;
  customer_id?: string;
  booker_id?: string;
  pemesan_id?: string;
  booker?: {
    id: string;
    name: string;
    email: string;
    phone_number: string;
  } | null;
  user_id?: string;
  status: StatusBookEntertainmentAttraction;
  subtotal: number;
  booking_date?: Date;
  expired_at?: Date;
  notes?: string | null;
  note?: string | null;
  book_entertainment_attraction_items?: BookEntertainmentAttractionItemData[];
  tourists?: BookEntertainmentAttractionTouristData[];
  created_at: Date;
  updated_at: Date;
}

export class BookEntertainmentAttractionResponse extends ResponseModel<BookEntertainmentAttractionData> {
  message: string;
  data?: BookEntertainmentAttractionData;
  datas?: BookEntertainmentAttractionData[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}
