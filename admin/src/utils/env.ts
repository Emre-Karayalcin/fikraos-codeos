/**
 * Validates environment variables and throws an error if required variables are missing
 */
export function validateEnv(): void {
  const requiredEnvVars = {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  };

  const missingVars: string[] = [];

  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value || value === 'undefined') {
      missingVars.push(key);
    }
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
}

/**
 * Get environment variable with validation
 */
export function getEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}
