// src/pages/DashboardPage.jsx
import React, { useState, lazy, Suspense } from "react";
import Documents from "./Documents";
import OfferLetterTabPage from "./OfferLetterTabPage";
import ReportsPage from "./ReportsPage";
import NotificationsAdmin from "./NotificationsAdmin";
import AdminLeavePage from "./AdminLeavesApproval";
import SalaryEditorModern from "./SalaryPageAdmin";
// import CandidatesPage from "./CandidatesPage"; // <-- your real page
const CandidatesPage = lazy(() => import("./CandidatesPage"));
const VerificationPage = lazy(() => import("./VerificationPage"));

const Reports = () => (
  <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
    <h3 className="text-lg font-semibold mb-3">Reports</h3>
    <p className="text-sm text-gray-600 dark:text-gray-300">
      Reports and analytics go here.
    </p>
  </div>
);

const Settings = () => (
  <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
    <h3 className="text-lg font-semibold mb-3">Settings</h3>
    <p className="text-sm text-gray-600 dark:text-gray-300">
      User and app settings go here.
    </p>
  </div>
);

const TABS = [
  { key: "candidates", label: "Candidates" },
  { key: "reports", label: "Reports" },
  { key: "offerLetter", label: "Offer Letter" },
  { key: "verification", label: "Verification" },
  { key: "documents", label: "Documents" },
  { key: "notification", label: "Notification" },
  { key: "leavesApproval", label: "Leaves Approval" },
   {key :"salary", label : "Salary Slip"},
];

export default function DashboardPage({ initialTab = "candidates" }) {
  const [active, setActive] = useState(initialTab);

  const renderActive = () => {
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
      case "verification":
        return (
          <Suspense fallback={<div>Loading...</div>}>
            <VerificationPage />
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
            <SalaryEditorModern/>
          </Suspense>
        );

       
      default:
        return <div>Not found</div>;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Left sidebar */}
      <aside className="w-64 p-4 border-r dark:border-gray-800 bg-white dark:bg-gray-900">
        <h2 className="text-xl font-bold mb-6">Dashboard</h2>

        <nav className="space-y-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between
                ${
                  active === t.key
                    ? "bg-gray-100 dark:bg-gray-800 font-semibold"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
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
