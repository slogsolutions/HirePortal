import { useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./pages/ProtectedRoute";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CandidatesPage from "./pages/CandidatesPage";
import CandidateProfilePage from "./pages/CandidateProfilePage";
import AboutUs from "./pages/AboutUs";
import IDCard from "./pages/IDCard";
import VerifyCandidatePage from "./pages/VerifyCandidatePage";
import InterviewPage from "./pages/InterviewPage";
import OfferPage from "./pages/OfferPage";
import OfferLetterTabPage from "./pages/OfferLetterTabPage";
import NotificationsAdmin from "./pages/NotificationsAdmin";

// ✅ FCM hook
import useFirebaseMessaging from "./hooks/useFirebaseMessaging";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
// ✅ Sonner Toaster
import { Toaster } from "sonner";
import EmployeeLeave from "./pages/LeaveRequestPage";
import AdminLeaveApproval from "./pages/AdminLeavesApproval";
import SalaryEditor from "./pages/SalaryPageAdmin";

function App() {
  const [count, setCount] = useState(0);

  // Get real auth user from context
  const { user, isAuthenticated } = useContext(AuthContext);

  // Initialize FCM only when authenticated
  const fcmToken = useFirebaseMessaging(isAuthenticated ? user : null);

  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global Sonner Toaster */}
        <Toaster position="top-right" richColors />

        <Navbar />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about-us" element={<AboutUs />} />

          {/* Protected routes wrapper */}
          <Route element={<ProtectedRoute />}>

            <Route path="/idcard/:id" element={<IDCard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/candidates/:id" element={<CandidateProfilePage />} />
            <Route
              path="/candidates/:id/verify"
              element={<VerifyCandidatePage />}
            />
            <Route
              path="/candidates/:id/interview"
              element={<InterviewPage />}
            />
            <Route path="/candidates/:id/offer" element={<OfferPage />} />

            <Route path="/offerletter" element={<OfferLetterTabPage />} />
            <Route path="/notifications" element={<NotificationsAdmin />} />

            <Route path="/leave" element={<EmployeeLeave />} />
            <Route path="/leaveApproval" element={<AdminLeaveApproval />} />
             <Route path="/salaryAdmin" element={<SalaryEditor />} />
            
          </Route>

          {/* catch-all -> redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
// ________________OLD ________________
