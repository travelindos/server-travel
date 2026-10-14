import { ResponseModel } from "./response.type";

export class MerekData {
  id: string;
  name_merek: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MerekResponse extends ResponseModel<MerekData> {
  message: string;
  data?: MerekData;
  datas?: MerekData[];
}

export class MotorTranslationData {
  id?: string;
  language_code: string;
  name_motor: string;
  slug: string;
  description: string;
}

export class VariantData {
  id: string;
  color: string;
}

export class MotorPriceData {
  id: string;
  price_type: string;
  price: number;
}

export class MotorData {
  id: string;
  merek_id: string;
  state_id: string;
  country_id: string;
  engine_cc: number;
  thumbnail: string;
  is_available: boolean;
  translations?: MotorTranslationData[];
  variants?: VariantData[];
  motor_prices?: MotorPriceData[];
  created_at?: Date;
  updated_at?: Date;
}

export class MotorResponse extends ResponseModel<MotorData> {
  message: string;
  data?: MotorData | MotorData[] | any;
  datas?: MotorData[];
}
