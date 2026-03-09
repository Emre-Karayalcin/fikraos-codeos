import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Paths } from '@/constants/path';
import { Loading } from '@/components/Loading';
import { AdminLayout } from '@/components/AdminLayout';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen size="large" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={Paths.Login} replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
};
