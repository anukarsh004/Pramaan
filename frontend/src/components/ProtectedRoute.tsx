import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="skeleton w-12 h-12 rounded-full"></div>
      </div>
    );
  }

  // If no user is logged in (should theoretically be handled by login page logic, but fallback)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if the user's role is in the allowed roles array
  if (!allowedRoles.includes(user.role)) {
    // Redirect unauthorized users to their respective home pages
    if (user.role === 'BIDDER') {
      return <Navigate to="/my-tenders" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
