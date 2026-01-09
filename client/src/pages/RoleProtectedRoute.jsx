import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

/**
 * RoleProtectedRoute - Protects routes based on user roles
 * @param {Array<string>} allowedRoles - Array of roles that can access this route
 * @param {string} redirectTo - Route to redirect to if unauthorized (default: "/unauthorized")
 */
const RoleProtectedRoute = ({ allowedRoles = [], redirectTo = "/unauthorized" }) => {
  const { user } = useContext(AuthContext);

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user's role is in allowed roles
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated and has required role
  return <Outlet />;
};

export default RoleProtectedRoute;
