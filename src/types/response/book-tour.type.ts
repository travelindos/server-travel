import { StatusBookTour } from '../../modules/book-tours/entities/book-tour.entity';
import { BookingAddOnData } from './book-motor.type';
import { ResponseModel } from './response.type';
import { ItineraryResponse } from './itinerary.type';

export class TouristResponseData {
  id: string;
  name: string;
  gender: string;
  phone_number?: string;
  nationality: string;
  passport_number: string;
}

export class BookerResponseData {
  id: string;
  name: string;
  email: string;
  phone_number: string;
}

export class TourResponseData {
  id: string;
  code: string;
  itinerary_id: string;
  customer_id: string;
  booker_id?: string;
  booker?: BookerResponseData;
  subtotal: number;
  tax: number;
  total: number;
  status: StatusBookTour;
  notes?: string | null;
  note?: string | null;
  itinerary?: ItineraryResponse;
  tourists?: TouristResponseData[];
  booking_add_ons?: BookingAddOnData[];
  created_at?: Date;
  updated_at?: Date;
}

export class TourResponse extends ResponseModel<TourResponseData> {
  message: string;
  data?: TourResponseData;
  datas?: TourResponseData[];
}
