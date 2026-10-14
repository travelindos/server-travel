import { Language } from '../../modules/destination/entities/destination-translation.entity';
import { ResponseModel } from './response.type';

export type DestinationResponse = {
  id: string;
  state_id: string;
  city_id?: string;
  city_name?: string;
  location: string;
  category_destination_id: string;
  category_destination_name?: string;
  price: number;
  thumbnail?: string;
  images?: string[];
  country_id?: string;
  country_name?: string;
  translations?: DestinationTranslationResponse[];
};

export type DestinationTranslationResponse = {
  id: number;
  destination_id: string;
  language_code: Language;
  name: string;
  slug: string;
  description: string;
  detail_tour: string[];
  facilities: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryDestinationResponse = {
  id: string;
  name: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  totalData: number;
  totalPage: number;
};

export interface ResponseDestination extends ResponseModel<DestinationResponse> {
  message: string;
  data?: DestinationResponse;
  datas?: DestinationResponse[];
  meta?: PaginationMeta;
}

export interface ResponseDestinationTranslation extends ResponseModel<DestinationTranslationResponse> {
  message: string;
  data: DestinationTranslationResponse;
}
