import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Higher-order component representing a protected route that redirects to login if the user is not authenticated.
 * @param {Array} allowedRoles roles that are allowed to access this route.
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand-200 border-dashed rounded-full animate-spin" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = user.role === 'viewer' ? '/my-schedule' : '/dashboard';
    return <Navigate to={home} replace />;
  }

  return children;
};

/**
 * Redirects authenticated users to their corresponding dashboard page based on their role.
 */
export const IndexRedirect = () => {
  const { user } = useAuth();
  const home = user?.role === 'viewer' ? '/my-schedule' : '/dashboard';
  return <Navigate to={home} replace />;
};
