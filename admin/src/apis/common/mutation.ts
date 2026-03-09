/* eslint-disable @typescript-eslint/no-explicit-any */
//
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { createPresignedUrl, uploadFile } from './request';
import type { CreatePresignedUrlPayload, UploadFilePayload } from './types';
import type { CreatePresignedUrlResponse } from './types';

export const useCreatePresignedUrl = (
  options?: UseMutationOptions<
    CreatePresignedUrlResponse,
    any,
    CreatePresignedUrlPayload,
    any
  >
) => {
  return useMutation({
    mutationFn: createPresignedUrl,
    ...options,
  });
};

export const useUploadFile = (
  options?: UseMutationOptions<void, any, UploadFilePayload, any>
) => {
  return useMutation({
    mutationFn: uploadFile,
    ...options,
  });
};
