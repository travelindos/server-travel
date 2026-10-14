import { ResponseModel } from './response.type';

export class ResponseCity {
  id: string;
  name: string;
  longitude: string;
  latitude: string;
}

export class ResponseState {
  id: string;
  name: string;
  longitude: string;
  latitude: string;
  cities?: ResponseCity[];
}

export class ResponseData {
  id: string;
  name: string;
  iso: string;
  phone_code: string;
  currency: string;
  flag: string;
  states?: ResponseState[];
}

export class LocationResponseModel extends ResponseModel<ResponseData> {
  message: string;
  data?: ResponseData;
  datas?: ResponseData[];
}
