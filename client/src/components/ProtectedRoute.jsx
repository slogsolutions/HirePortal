import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

/**
 * ProtectedRoute component that renders children only if user is authenticated
 * @param {Object} props - Component props
 * @param {string} [props.redirectTo="/login"] - Path to redirect to if user is not authenticated
 * @returns {React.ReactNode} - Rendered component or redirect
 */
const ProtectedRoute = ({ redirectTo = "/login" }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  
  if (loading) {
    // Show loading indicator while checking auth
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to={redirectTo} replace />;
};

export default ProtectedRoute;
