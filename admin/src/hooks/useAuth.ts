import { useGetMe } from '@/apis/auth/queries';

export const useAuth = () => {
  const {
    data: user,
    isLoading,
    error,
    ...rest
  } = useGetMe({
    retry: false,
  });

  const isAuthenticated = !!user && !error;
  const isUnauthenticated = !user || !!error;

  return {
    user,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    ...rest,
  };
};

// Re-export for convenience
export { useGetMe };
