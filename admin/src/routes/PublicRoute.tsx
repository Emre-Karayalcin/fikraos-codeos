import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Paths } from '@/constants/path';
import { Loading } from '@/components/Loading';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen size="large" />;
  }

  if (isAuthenticated) {
    return <Navigate to={Paths.UserManagement} replace />;
  }

  return <>{children}</>;
};
