/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { login, logout } from './request';
import type { LoginPayload, LoginResponse } from './types';

export const useLogin = (
  options?: Partial<UseMutationOptions<LoginResponse, any, LoginPayload, any>>
) => {
  return useMutation({
    mutationFn: login,
    ...options,
  });
};

export const useLogout = (
  options?: Partial<UseMutationOptions<void, any, void, any>>
) => {
  return useMutation({
    mutationFn: logout,
    ...options,
  });
};
