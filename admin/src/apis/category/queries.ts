/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getCategories, getCategory } from './request';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import type { Category, GetCategoriesResponse } from './types';
import type { GetCategoriesParams } from './types';

export const useGetCategories = (
  params?: GetCategoriesParams,
  options?: Partial<UseQueryOptions<any, any, GetCategoriesResponse, any>>
) => {
  const data = useQuery({
    queryKey: [QueryKeysEnum.GET_CATEGORIES, params],
    queryFn: () => getCategories(params || {} as GetCategoriesParams),
    staleTime: 5 * 60 * 1000,
    ...options,
  });

  return data;
};

export const useGetCategory = (
  id?: string,
  options?: Partial<UseQueryOptions<any, any, Category | null, any>>
) => {
  return useQuery({
    queryKey: [QueryKeysEnum.GET_CATEGORY_BY_ID, id],
    queryFn: () => getCategory(id || ''),
    enabled: !!id,
    ...options,
  });
};
