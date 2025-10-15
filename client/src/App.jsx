import { useState, useContext } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard'; // Admin dashboard
import UserDashboard from './pages/UserDashboard';
import CandidatesPage from './pages/CandidatesPage';
import CandidateProfilePage from './pages/CandidateProfilePage';
import AboutUs from './pages/AboutUs';
import IDCard from './pages/IDCard';
import UserPortal from './pages/UserPortal';

// Component to handle redirection based on user role
const RoleBasedRedirect = () => {
  const { user } = useContext(AuthContext);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  switch(user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'candidate':
      return <Navigate to="/candidate/dashboard" replace />;
    case 'hr':
    case 'reception':
      return <Navigate to={`/${user.role}/dashboard`} replace />;
    default:
      return <Navigate to="/user/dashboard" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/idcard/:id" element={<IDCard />} />

          {/* Protected routes with role-based access */}
          <Route element={<ProtectedRoute />}>
            {/* Default dashboard redirect based on role */}
            <Route path="/dashboard" element={<RoleBasedRedirect />} />
            
            {/* Admin routes */}
            <Route element={<RoleBasedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
              {/* Add more admin-only routes here */}
            </Route>

            {/* Candidate routes */}
            <Route element={<RoleBasedRoute allowedRoles={['candidate']} />}>
              <Route path="/candidate/dashboard" element={<UserDashboard />} />
              {/* Add more candidate-only routes here */}
            </Route>

            {/* HR routes */}
            <Route element={<RoleBasedRoute allowedRoles={['hr']} />}>
              <Route path="/hr/dashboard" element={<UserDashboard />} />
              {/* Add more HR-only routes here */}
            </Route>

            {/* Reception routes */}
            <Route element={<RoleBasedRoute allowedRoles={['reception']} />}>
              <Route path="/reception/dashboard" element={<UserDashboard />} />
              {/* Add more receptionist-only routes here */}
            </Route>

            {/* Common authenticated user routes */}
            <Route path="/portal" element={<UserPortal />} />
            <Route path="/profile" element={<UserDashboard />} />
          </Route>

          {/* Public candidate routes */}
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/candidates/:id" element={<CandidateProfilePage />} />

          {/* Catch-all -> redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App
