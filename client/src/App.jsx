import { useState, useContext, lazy, Suspense } from "react";
import "./App.css";
import PageSkeleton from "./components/ui/PageSkeleton";
import Navbar from "./components/Navbar";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import ProtectedRoute from "./pages/ProtectedRoute";
import useFirebaseMessaging from "./hooks/useFirebaseMessaging";
import { Toaster } from "sonner";

// --- Lazy Loaded Pages (IMPORTANT FIX) ---
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CandidatesPage = lazy(() => import("./pages/CandidatesPage"));
const CandidateProfilePage = lazy(() => import("./pages/CandidateProfilePage"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const IDCard = lazy(() => import("./pages/IDCard"));
const VerifyCandidatePage = lazy(() => import("./pages/VerifyCandidatePage"));
const InterviewPage = lazy(() => import("./pages/InterviewPage"));
const OfferPage = lazy(() => import("./pages/OfferPage"));
const OfferLetterTabPage = lazy(() => import("./pages/OfferLetterTabPage"));
const NotificationsAdmin = lazy(() => import("./pages/NotificationsAdmin"));
const EmployeeLeave = lazy(() => import("./pages/LeaveRequestPage"));
const AdminLeaveApproval = lazy(() => import("./pages/AdminLeavesApproval"));
const SalaryEditor = lazy(() => import("./pages/SalaryPageAdmin"));
const MassSalaryEditor = lazy(() => import("./pages/MassSalaryPageAdmin"));
const AdminReviewPage = lazy(() => import("./pages/PerformancePageAdmin"));
const EmployeeAttendancePage = lazy(() => import("./pages/EmployeeAttendancePage"));
const AdminAttendancePage = lazy(() => import("./pages/AdminAttendancePage"));
const AdminHolidays = lazy(() => import("./pages/AdminHolidaysPage"));
const AdminUsersWithDetail = lazy(() => import("./pages/EmployeeReportingAdminPage"));
const ProfilePage = lazy(() => import("./pages/MyProfilePage"));
const UserNotificationsPage = lazy(() => import("./pages/UserNotificationsPage"));
const MyPerformancePage = lazy(() => import("./pages/MyPerformancePage"));
const RoleProtectedRoute = lazy(() => import("./pages/RoleProtectedRoute"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const Index = lazy(() => import("./pages/Index"));
const ContactAdmin = lazy(() => import("./pages/ContactAdmin"));

// ❌ Keep these NON-lazy (important pages for UX)
import Login from "./pages/Login";
import Register from "./pages/Register";

// --- React Query Setup ---
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

/**
 * AppContent
 */
function AppContent() {
  const [count, setCount] = useState(0);

  const { user, isAuthenticated } = useContext(AuthContext);

  const fcmToken = useFirebaseMessaging(isAuthenticated ? user : null);

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />

      <Navbar />

      {/*  GLOBAL SKELETON LOADER */}
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complain" element={<ContactAdmin />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/idcard/:id" element={<IDCard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/candidates/:id" element={<CandidateProfilePage />} />
            <Route path="/candidates/:id/verify" element={<VerifyCandidatePage />} />
            <Route path="/candidates/:id/interview" element={<InterviewPage />} />
            <Route path="/candidates/:id/offer" element={<OfferPage />} />
            <Route path="/offerletter" element={<OfferLetterTabPage />} />

            <Route element={<RoleProtectedRoute allowedRoles={["admin", "manager", "hr"]} />}>
              <Route path="/notifications" element={<NotificationsAdmin />} />
            </Route>

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
            <Route path="/user-notifications" element={<UserNotificationsPage />} />
            <Route path="/my-performance" element={<MyPerformancePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

/**
 * App Wrapper
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;