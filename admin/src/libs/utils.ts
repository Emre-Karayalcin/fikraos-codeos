import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ApiError } from '@/types/api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(
  error: unknown,
  defaultMessage = 'An error occurred'
): string {
  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    return (
      apiError.detail || apiError.message || apiError.error || defaultMessage
    );
  }

  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  return defaultMessage;
}
