import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";


const ProtectedRoute = ({ redirectTo = "/login" }) => {
const { user } = useContext(AuthContext);
return user ? <Outlet /> : <Navigate to={redirectTo} replace />;
};


export default ProtectedRoute;