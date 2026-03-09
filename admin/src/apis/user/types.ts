import type { GetListParams } from '@/types/api';
import type { User } from '../auth';
import type { AccountType } from '../auth/types';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export interface GetUsersResponse {
  rows: User[];
  count: number | null;
}

export interface GetUsersParams extends GetListParams {
  search?: string;
  accountType?: AccountType;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: string;
}

export interface UpdateUserPayload {
  id: string;
  username?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
}
