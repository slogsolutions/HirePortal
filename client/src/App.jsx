// import { useState } from "react";
// import "./App.css";
// import Navbar from "./components/Navbar";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { AuthProvider } from "./context/AuthContext";
// import ProtectedRoute from "./pages/ProtectedRoute";
// import HomePage from "./pages/HomePage";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import Dashboard from "./pages/Dashboard";
// import CandidatesPage from "./pages/CandidatesPage";
// import CandidateProfilePage from "./pages/CandidateProfilePage";
// import AboutUs from "./pages/AboutUs";
// import IDCard from "./pages/IDCard";
// import VerifyCandidatePage from "./pages/VerifyCandidatePage";
// import InterviewPage from "./pages/InterviewPage";
// import OfferPage from "./pages/OfferPage";
// import OfferLetterTabPage from "./pages/OfferLetterTabPage";
// import NotificationsAdmin from "./pages/NotificationsAdmin";

// // ✅ FCM hook
// import useFirebaseMessaging from "./hooks/useFirebaseMessaging";
// import { useContext } from "react";
// import { AuthContext } from "./context/AuthContext";
// // ✅ Sonner Toaster
// import { Toaster } from "sonner";
// import EmployeeLeave from "./pages/LeaveRequestPage";
// import AdminLeaveApproval from "./pages/AdminLeavesApproval";
// import SalaryEditor from "./pages/SalaryPageAdmin";
// import MassSalaryEditor from "./pages/MassSalaryPageAdmin";
// import AdminReviewPage from "./pages/PerformancePageAdmin";
// import EmployeeAttendancePage from "./pages/EmployeeAttendancePage";
// import AdminAttendancePage from "./pages/AdminAttendancePage";
// import AdminHolidays from "./pages/AdminHolidaysPage";
// import EmployeeCalendarModern from "./pages/EmployeeAttendancePage";
// import AdminUsersWithDetail from "./pages/EmployeeReportingAdminPage";
// import ProfilePage from "./pages/MyProfilePage";

// function App() {
//   const [count, setCount] = useState(0);

//   // Get real auth user from context
//   const { user, isAuthenticated } = useContext(AuthContext);

//   // Initialize FCM only when authenticated
//   const fcmToken = useFirebaseMessaging(isAuthenticated ? user : null);

//   return (
//     <AuthProvider>
//       <BrowserRouter>
//         {/* Global Sonner Toaster */}
//         <Toaster position="top-right" richColors />

//         <Navbar />

//         <Routes>
//           <Route path="/" element={<HomePage />} />
//           <Route path="/login" element={<Login />} />
//           <Route path="/register" element={<Register />} />
//           <Route path="/about-us" element={<AboutUs />} />

//           {/* Protected routes wrapper */}
//           <Route element={<ProtectedRoute />}>

//             <Route path="/idcard/:id" element={<IDCard />} />
//             <Route path="/dashboard" element={<Dashboard />} />
//             <Route path="/candidates" element={<CandidatesPage />} />
//             <Route path="/candidates/:id" element={<CandidateProfilePage />} />
//             <Route
//               path="/candidates/:id/verify"
//               element={<VerifyCandidatePage />}
//             />
//             <Route
//               path="/candidates/:id/interview"
//               element={<InterviewPage />}
//             />
//             <Route path="/candidates/:id/offer" element={<OfferPage />} />

//             <Route path="/offerletter" element={<OfferLetterTabPage />} />
//             <Route path="/notifications" element={<NotificationsAdmin />} />

//             <Route path="/leave" element={<EmployeeLeave />} />
//             <Route path="/leaveApproval" element={<AdminLeaveApproval />} />
//              <Route path="/salaryAdmin" element={<SalaryEditor />} />
//               <Route path="/generate-salary" element={<MassSalaryEditor />} />
//                <Route path="/performance-review" element={<AdminReviewPage />} />
               
//                 <Route path="/attendance" element={<EmployeeAttendancePage />} />
//                    <Route path="/attendance/admin" element={<AdminAttendancePage />} />
//                       <Route path="/holidays/admin" element={<AdminHolidays />} />
//                            <Route path="/reporting/admin" element={<AdminUsersWithDetail />} />
//                              <Route path="/my-profile" element={<ProfilePage />} />
//           </Route>

//           {/* catch-all -> redirect to home */}
//           <Route path="*" element={<Navigate to="/" replace />} />
//         </Routes>
//       </BrowserRouter>
//     </AuthProvider>
//   );
// }

// export default App;
// // ________________OLD ________________









// new 






// --- Original Imports from Slog App (webA) ---
import { useState, useContext } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext"; // Import AuthContext here
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
import useFirebaseMessaging from "./hooks/useFirebaseMessaging";
import { Toaster } from "sonner"; // This is your original Sonner Toaster from webA
import EmployeeLeave from "./pages/LeaveRequestPage";
import AdminLeaveApproval from "./pages/AdminLeavesApproval";
import SalaryEditor from "./pages/SalaryPageAdmin";
import MassSalaryEditor from "./pages/MassSalaryPageAdmin";
import AdminReviewPage from "./pages/PerformancePageAdmin";
import EmployeeAttendancePage from "./pages/EmployeeAttendancePage";
import AdminAttendancePage from "./pages/AdminAttendancePage";
import AdminHolidays from "./pages/AdminHolidaysPage";
import AdminUsersWithDetail from "./pages/EmployeeReportingAdminPage";
import ProfilePage from "./pages/MyProfilePage";

// --- New Imports from shadcn/ui App (webB) ---
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import ContactAdmin from "./pages/ContactAdmin";
// We alias webB's Toaster to avoid a name conflict with 'sonner'
// import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
// We don't need webB's "Sonner" import, since you already import it from "sonner" directly.

// --- Setup from webB ---
const queryClient = new QueryClient();

/**
 * @component AppContent
 * This component holds all the logic that needs to be *inside* the providers.
 * This is necessary so it can use `useContext(AuthContext)`.
 */
function AppContent() {
  const [count, setCount] = useState(0); // This was in your original App.jsx

  // Get real auth user from context
  const { user, isAuthenticated } = useContext(AuthContext);

  // Initialize FCM only when authenticated
  const fcmToken = useFirebaseMessaging(isAuthenticated ? user : null);

  return (
    <BrowserRouter>
      {/* Global Sonner Toaster (from webA) */}
      <Toaster position="top-right" richColors />

      {/* Global shadcn Toaster (from webB) */}
      {/* <ShadcnToaster /> */}

      <Navbar />

      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/complain" element={<ContactAdmin />} />
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
          <Route path="/generate-salary" element={<MassSalaryEditor />} />
          <Route path="/performance-review" element={<AdminReviewPage />} />
          <Route path="/attendance" element={<EmployeeAttendancePage />} />
          <Route path="/attendance/admin" element={<AdminAttendancePage />} />
          <Route path="/holidays/admin" element={<AdminHolidays />} />
          <Route path="/reporting/admin" element={<AdminUsersWithDetail />} />
          <Route path="/my-profile" element={<ProfilePage />} />
        </Route>

        {/* catch-all -> redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * @component App
 * This is the main wrapper that provides all global context.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          {/* AppContent is the child that consumes the context */}
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;