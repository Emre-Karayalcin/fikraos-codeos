/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getRoles, getRole } from './request';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import type { Role, GetRolesResponse } from './types';
import type { GetRolesParams } from './types';

export const useGetRoles = (
  params?: GetRolesParams,
  options?: Partial<UseQueryOptions<any, any, GetRolesResponse, any>>
) => {
  return useQuery({
    queryKey: [QueryKeysEnum.GET_ROLES, params],
    queryFn: () => getRoles(params || {} as GetRolesParams),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useGetRole = (
  id?: string,
  options?: Partial<UseQueryOptions<any, any, Role | null, any>>
) => {
  return useQuery({
    queryKey: [QueryKeysEnum.GET_ROLE_BY_ID, id],
    queryFn: () => getRole(id || ''),
    enabled: !!id,
    ...options,
  });
};
