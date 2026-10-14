import { ResponseModel } from './response.type';

// ─── Customer Profile Data ────────────────────────────────────────────────────

export class CustomerCountryData {
  id: string;
  name: string;
  code: string;
}

export class CustomerProfileData {
  id: string;
  latitude?: string;
  longitude?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: CustomerCountryData;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Customer Data ────────────────────────────────────────────────────────────

export class CustomerData {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  is_verified: boolean;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerDetailData extends CustomerData {
  profile?: CustomerProfileData;
}

// ─── Auth Data ────────────────────────────────────────────────────────────────

export class CustomerAuthData {
  id: string;
  name: string;
  email: string;
  is_verified: boolean;
  avatar?: string;
  access_token: string;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export class CustomerResponse extends ResponseModel<CustomerData> {
  message: string;
  data?: CustomerData;
  datas?: CustomerData[];
}

export class CustomerDetailResponse extends ResponseModel<CustomerDetailData> {
  message: string;
  data?: CustomerDetailData;
}

export class CustomerAuthResponse extends ResponseModel<CustomerAuthData> {
  message: string;
  data?: CustomerAuthData;
}

export class CustomerProfileResponse extends ResponseModel<CustomerProfileData> {
  message: string;
  data?: CustomerProfileData;
}
