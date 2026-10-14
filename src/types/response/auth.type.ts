import { ResponseModel } from './response.type';

export class AuthData {
  id: string;
  name: string;
  email: string;
  is_verified: boolean;
  role_id: string;
  role?: {
    id: string;
    name: string;
    code: string;
    level?: number;
    permissions?: string[];
  };
  session?: string;
}

export class AuthResponse extends ResponseModel<AuthData> {
  message: string;
  data?: AuthData;
  datas?: AuthData[];
}
