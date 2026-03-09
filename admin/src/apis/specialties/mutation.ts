/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { createSpecialty, deleteSpecialties, updateSpecialty } from './request';
import type { CreateSpecialtyPayload, UpdateSpecialtyPayload } from './types';

export const useCreateSpecialty = (
  options?: Omit<UseMutationOptions<any, any, CreateSpecialtyPayload, any>, 'mutationFn'>
) => {
  return useMutation({ mutationFn: createSpecialty, ...options });
};

export const useUpdateSpecialty = (
  options?: Omit<UseMutationOptions<any, any, Partial<UpdateSpecialtyPayload>, any>, 'mutationFn'>
) => {
  return useMutation({ mutationFn: updateSpecialty, ...options });
};

export const useDeleteSpecialties = (
  options?: Omit<UseMutationOptions<void, any, string[], any>, 'mutationFn'>
) => {
  return useMutation({ mutationFn: deleteSpecialties, ...options });
};
