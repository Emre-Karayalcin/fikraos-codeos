import { validateEnv } from '@/utils/env';

// Validate environment variables on import
try {
  validateEnv();
} catch (error) {
  if (import.meta.env.DEV) {
    console.warn(
      'Environment validation warning:',
      (error as Error).message,
      '\nUsing default values for development.'
    );
  } else {
    throw error;
  }
}

export const ENVS = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://localhost:3000/api' : ''),
};
