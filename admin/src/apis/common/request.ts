import axios from 'axios';
import { request } from '../axios';
import type {
  CreatePresignedUrlPayload,
  CreatePresignedUrlResponse,
  UploadFilePayload,
} from './types';

export const createPresignedUrl = async (
  payload: CreatePresignedUrlPayload
): Promise<CreatePresignedUrlResponse> => {
  return await request({
    url: `files/pre-signed`,
    method: 'POST',
    data: payload,
  });
};

export const uploadFile = async (payload: UploadFilePayload): Promise<void> => {
  // Create a clean axios instance without any default headers
  const uploadInstance = axios.create();

  return await uploadInstance({
    url: payload.url,
    method: 'PUT',
    data: payload.file,
    headers: {
      'Content-Type': payload.file.type,
      'Content-Length': payload.file.size,
    },
    transformRequest: [(data: File) => data],
  });
};
