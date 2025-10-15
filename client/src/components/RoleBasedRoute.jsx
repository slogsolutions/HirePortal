import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * RoleBasedRoute component that renders children based on user role
 * @param {Object} props - Component props
 * @param {string[]} props.allowedRoles - Array of roles that are allowed to access the route
 * @param {string} [props.redirectTo='/'] - Path to redirect to if user is not authorized
 * @param {React.ReactNode} [props.unauthorizedComponent] - Component to render if user is not authorized
 * @returns {React.ReactNode} - Rendered component or redirect
 */
const RoleBasedRoute = ({
  allowedRoles = [],
  redirectTo = '/',
  unauthorizedComponent: UnauthorizedComponent,
  children
}) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    // Show loading indicator while checking auth
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // If not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Check if user has any of the allowed roles
  const hasRequiredRole = allowedRoles.length === 0 || 
                         (user && allowedRoles.includes(user.role));

  if (!hasRequiredRole) {
    // If user doesn't have required role
    if (UnauthorizedComponent) {
      return <UnauthorizedComponent />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  // If user is authenticated and has required role, render children
  return children || <Outlet />;
};

export default RoleBasedRoute;
