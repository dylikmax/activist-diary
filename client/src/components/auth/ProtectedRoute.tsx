import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessRoute, type RouteRole } from '../../lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: RouteRole[];
}

export const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="loading-spinner">Проверка авторизации...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !canAccessRoute(user.role, roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};