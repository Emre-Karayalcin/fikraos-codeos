export enum AccountType {
  PROFESSIONAL = 'PROFESSIONAL',
  CUSTOMER = 'CUSTOMER',
}

export enum RoleEnum {
  ADMIN = 'admin',
  USER = 'user',
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: RoleEnum;
  phone?: string;
  tel?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export type LoginResponse = {
  access_token: string;
  token_type: string;
};
