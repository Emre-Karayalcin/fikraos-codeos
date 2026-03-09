/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { getMe } from './request';
import { QueryKeysEnum } from '@/types/queryKeyEnum';
import type { User } from './types';

export const useGetMe = (
  options?: Partial<UseQueryOptions<any, any, User, any>>
) => {
  const data = useQuery({
    queryKey: [QueryKeysEnum.GET_ME],
    queryFn: getMe,
    staleTime: Infinity,
    gcTime: Infinity, // Keep in cache indefinitely (was cacheTime in older versions)
    refetchOnMount: true, // Always check on mount
    refetchOnReconnect: true, // Check when reconnecting
    ...options,
  });

  return data;
};
