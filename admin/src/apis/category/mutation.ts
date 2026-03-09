/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { createCategory, deleteCategories, updateCategory } from './request';
import type { CreateCategoryPayload, UpdateCategoryPayload } from './types';

export const useCreateCategory = (
  options?: Omit<UseMutationOptions<any, any, CreateCategoryPayload, any>, 'mutationFn'>
) => {
  return useMutation({ mutationFn: createCategory, ...options });
};

export const useUpdateCategory = (
  options?: Omit<UseMutationOptions<any, any, Partial<UpdateCategoryPayload>, any>, 'mutationFn'>
) => {
  return useMutation({ mutationFn: updateCategory, ...options });
};

export const useDeleteCategories = (
  options?: Omit<UseMutationOptions<void, any, string[], any>, 'mutationFn'>
) => {
  return useMutation({ mutationFn: deleteCategories, ...options });
};
