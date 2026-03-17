import type { FC } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  requireCompleteProfile?: boolean;
  requireIncompleteProfile?: boolean;
}

const getAuthenticatedRedirectPath = (isProfileComplete: boolean) =>
  isProfileComplete ? '/dashboard' : '/onboarding';

const RouteLoader: FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0f0a1e] text-base font-medium text-white">
    Loading...
  </div>
);

export const PublicOnlyRoute: FC = () => {
  const { isAuthenticated, isLoading, isProfileComplete } = useAuth();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to={getAuthenticatedRedirectPath(isProfileComplete)} replace />;
  }

  return <Outlet />;
};

export const ProtectedRoute: FC<ProtectedRouteProps> = ({
  requireCompleteProfile = false,
  requireIncompleteProfile = false,
}) => {
  const { isAuthenticated, isLoading, isProfileComplete } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireCompleteProfile && !isProfileComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  if (requireIncompleteProfile && isProfileComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export const AppRouteFallback: FC = () => {
  const { isAuthenticated, isLoading, isProfileComplete } = useAuth();

  if (isLoading) {
    return <RouteLoader />;
  }

  return (
    <Navigate
      to={isAuthenticated ? getAuthenticatedRedirectPath(isProfileComplete) : '/'}
      replace
    />
  );
};
