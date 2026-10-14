import { StatusItinerary } from '../../modules/itinerary/entities/itinerary.entity';
import { ResponseModel } from './response.type';

export type DestinationItemSummary = {
  id: string;
  price: number;
};

export type ItineraryItemResponse = {
  id: string;
  destination_id: string;
  destination?: DestinationItemSummary;
  visit_date: string;
  createdAt: Date;
};

export type ItineraryResponse = {
  id: string;
  customer_id: string;
  country_id: string;
  state_id: string;
  status: StatusItinerary;
  subtotal: number;
  edit_count: number;
  max_edits: number;
  can_edit: boolean;
  itinerary_items: ItineraryItemResponse[];
  createdAt: Date;
  updatedAt: Date;
};

export interface ResponseItinerary extends ResponseModel<ItineraryResponse> {
  message: string;
  data?: ItineraryResponse;
  datas?: ItineraryResponse[];
}
