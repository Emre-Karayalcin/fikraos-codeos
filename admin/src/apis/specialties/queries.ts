/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getSpecialties, getSpecialty } from './request';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import type { Specialty } from './types';

export const useGetSpecialties = (
  params?: any,
  options?: Partial<UseQueryOptions<any, any, { rows: Specialty[]; count: number | null }, any>>
) => {
  return useQuery({
    queryKey: [QueryKeysEnum.GET_SPECIALTIES, params],
    queryFn: () => getSpecialties(params || {}),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useGetSpecialty = (
  id?: string,
  options?: Partial<UseQueryOptions<any, any, Specialty | null, any>>
) => {
  return useQuery({
    queryKey: [QueryKeysEnum.GET_SPECIALTY_BY_ID, id],
    queryFn: () => getSpecialty(id || ''),
    enabled: !!id,
    ...options,
  });
};
