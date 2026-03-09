import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { STORAGE_KEYS } from '@/constants/app';
import { Paths } from '@/constants/path';
import { ENVS } from '@/constants/env';
import type { ApiError } from '@/types/api';

export interface RequestConfig extends AxiosRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: unknown;
}

export const axiosInstance = axios.create({
  baseURL: ENVS.API_BASE_URL,
  paramsSerializer: {
    // This will ensure arrays are serialized as repeated parameters
    // e.g., ?id=1&id=2 instead of ?id=1,2
    indexes: null, // This prevents array indexes in param names
    serialize: (params: Record<string, unknown>) => {
      const parts: string[] = [];

      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Handle array values
          value.forEach(item => {
            parts.push(
              `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`
            );
          });
        } else if (value !== null && value !== undefined) {
          // Handle non-array values
          parts.push(
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
          );
        }
      });

      return parts.join('&');
    },
  },
});

axiosInstance.interceptors.response.use(
  response => response,
  async (error: AxiosError<ApiError>) => {
    const { response } = error;

    if (response?.status === 401) {
      localStorage.clear();
      window.location.href = Paths.Login;
    }

    // Return a consistent error format
    const apiError: ApiError = {
      message: response?.data?.message || error.message || 'An error occurred',
      detail: response?.data?.detail,
      error: response?.data?.error,
      statusCode: response?.status,
    };

    return Promise.reject(apiError);
  }
);

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

export const request = async <T = unknown>(
  config: RequestConfig
): Promise<T> => {
  const response = await axiosInstance(config);
  return response.data as T;
};
