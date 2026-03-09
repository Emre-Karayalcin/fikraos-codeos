import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { createUser, deleteUsers, updateUser } from './request';
import type { CreateUserPayload, UpdateUserPayload } from './types';
import type { User } from '../auth';
import type { ApiError } from '@/types/api';

export const useCreateUser = (
  options?: Omit<
    UseMutationOptions<User, ApiError, CreateUserPayload, unknown>,
    'mutationFn'
  >
) => {
  return useMutation<User, ApiError, CreateUserPayload>({
    mutationFn: createUser,
    ...options,
  });
};

export const useUpdateUser = (
  options?: Omit<
    UseMutationOptions<User, ApiError, Partial<UpdateUserPayload>, unknown>,
    'mutationFn'
  >
) => {
  return useMutation<User, ApiError, Partial<UpdateUserPayload>>({
    mutationFn: updateUser,
    ...options,
  });
};

export const useDeleteUsers = (
  options?: Omit<
    UseMutationOptions<void, ApiError, string[], unknown>,
    'mutationFn'
  >
) => {
  return useMutation<void, ApiError, string[]>({
    mutationFn: deleteUsers,
    ...options,
  });
};
