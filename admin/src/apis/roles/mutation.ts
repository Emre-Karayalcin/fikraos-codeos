/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { createRole, deleteRoles, updateRole } from './request';
import type { CreateRolePayload, UpdateRolePayload } from './types';

export const useCreateRole = (
  options?: Omit<UseMutationOptions<any, any, CreateRolePayload, any>, 'mutationFn'>
) => {
  return useMutation({ mutationFn: createRole, ...options });
};

export const useUpdateRole = (
  options?: Omit<UseMutationOptions<any, any, Partial<UpdateRolePayload>, any>, 'mutationFn'>
) => {
  return useMutation({ mutationFn: updateRole, ...options });
};

export const useDeleteRoles = (
  options?: Omit<UseMutationOptions<void, any, string[], any>, 'mutationFn'>
) => {
  return useMutation({ mutationFn: deleteRoles, ...options });
};
