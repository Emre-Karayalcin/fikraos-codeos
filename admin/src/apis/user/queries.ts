/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { QueryKeysEnum } from '@/types/queryKeyEnum';
import type { User } from '../auth';
import { getUser, getUsers } from './request';
import type { GetUsersParams, GetUsersResponse } from './types';

export const useGetUsers = (
  params: GetUsersParams,
  options?: Partial<UseQueryOptions<any, any, GetUsersResponse, any>>
) => {
  const data = useQuery({
    queryKey: [QueryKeysEnum.GET_USERS, params],
    queryFn: async () => {
      const data = await getUsers(params);

      return data;
    },
    ...options,
  });

  return data;
};

export const useGetUser = (
  id: string,
  options?: Partial<UseQueryOptions<any, any, User, any>>
) => {
  const data = useQuery({
    queryKey: [QueryKeysEnum.GET_USER_BY_ID, id],
    queryFn: async () => {
      const data = await getUser(id);

      return data;
    },
    enabled: !!id,
    ...options,
  });

  return data;
};
