// src/pages/DashboardPage.jsx
import React, { useState, lazy, Suspense, useContext, useMemo, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import Documents from "./Documents";
import OfferLetterTabPage from "./OfferLetterTabPage";
import ReportsPage from "./ReportsPage";
import NotificationsAdmin from "./NotificationsAdmin";
import AdminLeavePage from "./AdminLeavesApproval";
import SalaryEditorModern from "./SalaryPageAdmin";
import MassSalaryEditor from "./MassSalaryPageAdmin";
import AdminReviewPage from "./PerformancePageAdmin";
import AdminUsersWithDetail from "./EmployeeReportingAdminPage";
import AdminHolidays from "./AdminHolidaysPage";
import EmployeeTable from "./EmpCodeAdminPage";
import MyPerformancePage from "./MyPerformancePage";

import { ShieldX } from "lucide-react";
// import CandidatesPage from "./CandidatesPage"; // <-- your real page
const CandidatesPage = lazy(() => import("./CandidatesPage"));
const VerificationPage = lazy(() => import("./VerificationPage"));

const Reports = () => (
  <div className="p-4 bg-white dark:bg-slate-900 rounded shadow">
    <h3 className="text-lg font-semibold mb-3">Reports</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">
      Reports and analytics go here.
    </p>
  </div>
);

const Settings = () => (
  <div className="p-4 bg-white dark:bg-slate-900 rounded shadow">
    <h3 className="text-lg font-semibold mb-3">Settings</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">
      User and app settings go here.
    </p>
  </div>
);

const TABS = [
  { key: "candidates", label: "Candidates" ,allowedRoles: ['admin', 'manager', 'hr']},
  { key: "reports", label: "Reports",allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "offerLetter", label: "Offer Letter",allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "EmployeeCode", label: "Employee's Codes",allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "documents", label: "Documents", allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "notification", label: "Notification", allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "leavesApproval", label: "Leaves Approval",allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "salary", label: "Salary Slip", allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "massSalary", label: "Generate Salary",allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "reportingAdmin", label: "Employee Daily Reporting", allowedRoles: ['admin', 'manager', 'hr'] },
   { key: "holidaysAdmin", label: "Add Holidays",allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "performanceReview", label: "Employee Performance",allowedRoles: ['admin', 'manager', 'hr'] },
  { key: "myPerformance", label: "My Performance", allowedRoles: ['admin', 'manager', 'hr','employee']  }, // Accessible to all employees
  
  
];

// Helper function to check if user has required role
const hasAccess = (userRole, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
};

// Inline Unauthorized component for dashboard
const DashboardUnauthorized = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4 p-8 bg-white dark:bg-slate-900 rounded-lg shadow">
      <div className="flex justify-center">
        <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4">
          <ShieldX className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          You are not authorized to access this section.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          This section is restricted to specific user roles.
        </p>
      </div>
    </div>
  </div>
);

export default function DashboardPage({ initialTab = "candidates" }) {
  const { user } = useContext(AuthContext);
  const [active, setActive] = useState(initialTab);

  // Filter tabs based on user role
  const visibleTabs = useMemo(() => {
    return TABS.filter(tab => hasAccess(user?.role, tab.allowedRoles));
  }, [user?.role]);

  // Check if current active tab is accessible
  const activeTab = TABS.find(tab => tab.key === active);
  const canAccessActiveTab = hasAccess(user?.role, activeTab?.allowedRoles);

  // If user tries to access restricted tab, redirect to first available tab
  useEffect(() => {
    if (!canAccessActiveTab && visibleTabs.length > 0) {
      setActive(visibleTabs[0].key);
    }
  }, [canAccessActiveTab, visibleTabs]);

  const renderActive = () => {
    // Show unauthorized message if user doesn't have access
    if (!canAccessActiveTab) {
      return <DashboardUnauthorized />;
    }

    switch (active) {
      case "candidates":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <CandidatesPage />
          </Suspense>
        );
      case "reports":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <ReportsPage />;
          </Suspense>
        );
      case "offerLetter":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            {" "}
            <OfferLetterTabPage />;
          </Suspense>
        );
      case "EmployeeCode":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <EmployeeTable/>
          </Suspense>
        );
      case "documents":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <Documents />
          </Suspense>
        );
      case "notification":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <NotificationsAdmin />{" "}
          </Suspense>
        );

      case "leavesApproval":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <AdminLeavePage />
          </Suspense>
        );

      case "salary":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <SalaryEditorModern />
          </Suspense>
        );
      case "massSalary":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <MassSalaryEditor />
          </Suspense>
        );
      case "performanceReview":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <AdminReviewPage />
          </Suspense>
        );
      case "reportingAdmin":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <AdminUsersWithDetail />
          </Suspense>
        );
        case "holidaysAdmin":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <AdminHolidays />
          </Suspense>
        );
        case "myPerformance":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <MyPerformancePage />
          </Suspense>
        );

        

      default:
        return <div>Not found</div>;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950">
      {/* Left sidebar */}
      <aside className="w-64 p-4 border-r dark:border-slate-800 bg-white dark:bg-slate-900">
        <h2 className="text-xl font-bold mb-6">Dashboard</h2>

        <nav className="space-y-2">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between
                ${
                  active === t.key
                    ? "bg-gray-100 dark:bg-slate-800 font-semibold"
                    : "hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
            >
              <span>{t.label}</span>
              {active === t.key && (
                <span className="text-xs text-gray-500">●</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Right content */}
      <main className="flex-1 p-6">{renderActive()}</main>
    </div>
  );
}
