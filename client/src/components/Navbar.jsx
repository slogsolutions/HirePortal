// src/components/Navbar.jsx
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import FcmTokenModal from "./FcmTokenModal";
import { Sun, Moon, Menu, X } from "lucide-react";
import {
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function Navbar({ brand = "Slog Solutions" }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // UI state
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showFcmModal, setShowFcmModal] = useState(false);

  // Profile details
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");

  const profileRef = useRef(null);

  // Dark mode toggle effect
  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDark]);

  // Close profile dropdown on outside click / Escape
  useEffect(() => {
    function onClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Set user profile info
  useEffect(() => {
    if (user) {
      setDisplayName(
        user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.email ||
          "User"
      );
      setAvatarUrl(user.photoUrl || null);
    } else {
      setDisplayName("");
      setAvatarUrl(null);
    }
  }, [user]);

  // Login / Logout handler
  const handleAuthAction = useCallback(() => {
    if (user) {
      try {
        logout && logout();
      } catch (e) {
        localStorage.removeItem("auth:v1");
        localStorage.removeItem("auth");
        localStorage.removeItem("user");
      }
      navigate("/");
    } else {
      navigate("/login");
    }
    setMobileOpen(false);
    setProfileOpen(false);
  }, [user, logout, navigate]);

  // Get initials
  const initials = (name) => {
    if (!name) return "U";
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: brand + mobile menu */}
        <div className="flex items-center gap-4">
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
            onClick={() => setMobileOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link to="/" className="flex items-center gap-3">
            {/* Logo image */}
            <img
              src="/slog-logo.png"
              alt={brand}
              className="h-8 w-auto object-contain dark:brightness-125 transition-transform hover:scale-105"
            />

            {/* Small tagline */}
            <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400">
              Employee Portal
            </span>
          </Link>
        </div>

        {/* Center: desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
          >
            Home
          </Link>
          <Link
            to="/about-us"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
          >
            About Us
          </Link>

          {user && (
            <>
              <Link
                to="/notifications"
                className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
              >
                Notifications
              </Link>
              {/* <Link
                to="/attendance"
                className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
              >
                Daily Reporting
              </Link> */}
              {/* <Link
                to="/leave"
                className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
              >
                Apply Leave
              </Link> */}
              <Link
                to="/dashboard"
                className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
              >
                Dashboard
              </Link>
            </>
          )}
        </div>

        {/* Right: utilities (dark mode, FCM, login/profile) */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDark((s) => !s)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 focus:outline-none"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Save FCM Token - visible only when logged in */}
          {user && (
            <button
              onClick={() => setShowFcmModal(true)}
              className="px-3 py-1 rounded-lg text-white bg-green-600 hover:bg-green-700 text-sm"
            >
              Save FCM Token
            </button>
          )}

          {/* Show Login button only when NOT logged in */}
          {!user && (
            <button
              onClick={handleAuthAction}
              className="hidden md:inline-block px-4 py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600"
            >
              Login
            </button>
          )}

          {/* Profile avatar / dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((s) => !s)}
              className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              {user ? (
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName ? `${displayName} avatar` : "User avatar"}
                    className="h-9 w-9 rounded-full object-cover border"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      setAvatarUrl(null);
                    }}
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-indigo-900 text-gray-700 dark:text-indigo-100 flex items-center justify-center font-semibold">
                    {initials(displayName)}
                  </div>
                )
              ) : (
                <div className="h-9 w-9 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-semibold">
                  ?
                </div>
              )}
              <ChevronDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
              >
                <div className="py-2">
                  <Link
                    to="/my-profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <UserCircleIcon className="h-4 w-4" />
                    View Profile
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    Settings
                  </Link>

                  {user && (
                    <>
                      <Link
                        to="/attendance"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Daily Reporting
                      </Link>
                      <Link
                        to="/leave"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Apply Leave
                      </Link>
                    </>
                  )}

                  {/* Logout inside dropdown */}
                  {user && (
                    <button
                      onClick={() => {
                        handleAuthAction();
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile dropdown content */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="block px-2 py-2 text-gray-800 dark:text-gray-200 hover:text-blue-500"
          >
            Home
          </Link>

          <Link
            to="/about-us"
            onClick={() => setMobileOpen(false)}
            className="block px-2 py-2 text-gray-800 dark:text-gray-200 hover:text-blue-500"
          >
            About Us
          </Link>

          {user && (
            <>
              <Link
                to="/notifications"
                onClick={() => setMobileOpen(false)}
                className="block px-2 py-2 text-gray-800 dark:text-gray-200 hover:text-blue-500"
              >
                Notifications
              </Link>

              <Link
                to="/attendance"
                onClick={() => setMobileOpen(false)}
                className="block px-2 py-2 text-gray-800 dark:text-gray-200 hover:text-blue-500"
              >
                Daily Reporting
              </Link>

              <Link
                to="/leave"
                onClick={() => setMobileOpen(false)}
                className="block px-2 py-2 text-gray-800 dark:text-gray-200 hover:text-blue-500"
              >
                Apply Leave
              </Link>

              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block px-2 py-2 text-gray-800 dark:text-gray-200 hover:text-blue-500"
              >
                Dashboard
              </Link>
            </>
          )}

          {/* Dark mode toggle (mobile) */}
          <button
            onClick={() => {
              setIsDark((s) => !s);
              setMobileOpen(false);
            }}
            className="mt-2 w-full flex items-center gap-2 p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-sm">
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          {/* Show Login only when NOT logged in */}
          {!user && (
            <button
              onClick={() => {
                handleAuthAction();
                setMobileOpen(false);
              }}
              className="mt-3 w-full px-4 py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600"
            >
              Login
            </button>
          )}
        </div>
      )}

      {/* FCM modal */}
      <FcmTokenModal
        isOpen={showFcmModal}
        onClose={() => setShowFcmModal(false)}
      />
    </nav>
  );
}

Navbar.propTypes = {
  brand: PropTypes.string,
};
