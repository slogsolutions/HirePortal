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
import { useNotifications } from "../context/NotificationContext";
import FcmTokenModal from "./FcmTokenModal";
import NotificationDropdown from "./NotificationDropdown";
import { Sun, Moon, Menu, X, Bell } from "lucide-react";
import {
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function Navbar({ brand = "Slog Solutions" }) {
  const { user, logout } = useContext(AuthContext);
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [showFcmModal, setShowFcmModal] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [displayName, setDisplayName] = useState("");

  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const HomeRef = useRef();

  useGSAP(() => {
    gsap.from(HomeRef.current, {
      opacity: 0,
      scale: 0.8, // small pop effect
      duration: 0.9,
      // ease: "back.out(1.7)",
      delay: 0.5,
        y: 10, 
    });
  });

  // Initialize theme from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("site:theme");
      if (saved === "dark") setIsDark(true);
      else if (saved === "light") setIsDark(false);
      // else leave default false
    } catch (e) {
      // ignore localStorage errors
    }
  }, []);

  // Toggle `.dark` on .themeClass wrapper (preferred) — fallback to <html>
  useEffect(() => {
    const wrapper = document.querySelector(".themeClass");
    if (wrapper) {
      wrapper.classList.toggle("dark", isDark);
    } else {
      // fallback (if you don't use themeClass on the page)
      document.documentElement.classList.toggle("dark", isDark);
    }

    try {
      localStorage.setItem("site:theme", isDark ? "dark" : "light");
    } catch (e) {
      // ignore localStorage write errors
    }
  }, [isDark]);

  // Close profile dropdown
  useEffect(() => {
    function onClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        // Don't close if clicking on the bell icon
        if (!e.target.closest('[data-notification-bell]')) {
          setNotificationOpen(false);
        }
      }
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setNotificationOpen(false);
      }
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

  const initials = (name) => {
    if (!name) return "U";
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 py-4 backdrop-blur-md bg-background/80 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          {/* Left: brand + mobile menu */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen((s) => !s)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>

            <Link to="/" className="flex items-center gap-2">
              <img
                src="/slog-logo.png"
                alt={brand}
                className="h-8 w-auto object-contain"
              />
              <span className="font-display font-bold text-xl hidden sm:inline">
                {brand}
              </span>
            </Link>
          </div>

          {/* Center: desktop links */}
          <div className="hidden md:flex items-center gap-8" ref={HomeRef}>
            <Link
              to="/"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link
              to="/about-us"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              About Us
            </Link>

            {user && (
              <Link
                to="/dashboard"
                className="text-foreground/80 hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Right: utilities (dark mode, notifications, FCM, login/profile) */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark((s) => !s)}
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <Sun size={18} className="rotate-0 scale-100" />
              ) : (
                <Moon size={18} className="rotate-0 scale-100" />
              )}
            </Button>

            {/* Notification Bell - visible only when logged in */}
            {user && (
              <div className="relative" ref={notificationRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNotificationOpen((s) => !s)}
                  aria-label="Notifications"
                  data-notification-bell
                  className="relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
                <NotificationDropdown
                  isOpen={notificationOpen}
                  onClose={() => setNotificationOpen(false)}
                />
              </div>
            )}

            {/* Save FCM Token - visible only when logged in */}
            {user && (
              <Button
                size="sm"
                onClick={() => setShowFcmModal(true)}
                className="hidden sm:inline-flex bg-green-600 hover:bg-green-700 text-white"
              >
                Save FCM Token
              </Button>
            )}

            {/* Show Login button only when NOT logged in */}
            {!user && (
              <Button
                onClick={handleAuthAction}
                className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
              >
                Login
              </Button>
            )}

            {/* Profile avatar / dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((s) => !s)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-accent focus:outline-none"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                {user ? (
                  avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={
                        displayName ? `${displayName} avatar` : "User avatar"
                      }
                      className="h-9 w-9 rounded-full object-cover border"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        setAvatarUrl(null);
                      }}
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {initials(displayName)}
                    </div>
                  )
                ) : (
                  <div className="h-9 w-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
                    ?
                  </div>
                )}
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                >
                  <div className="py-2">
                    <Link
                      to="/my-profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <UserCircleIcon className="h-4 w-4" />
                      View Profile
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent"
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                      Settings
                    </Link>

                    {user && (
                      <>
                        <Link
                          to="/attendance"
                          onClick={() => setProfileOpen(false)}
                          className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                        >
                          Daily Reporting
                        </Link>
                        <Link
                          to="/leave"
                          onClick={() => setProfileOpen(false)}
                          className="block px-4 py-2 text-sm text-foreground hover:bg-accent"
                        >
                          Apply Leave
                        </Link>
                      </>
                    )}

                    {user && (
                      <button
                        onClick={handleAuthAction}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-accent"
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
          <div className="md:hidden bg-background px-4 py-3 border-t border-border">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="block px-2 py-2 text-foreground hover:text-primary"
            >
              Home
            </Link>

            <Link
              to="/about-us"
              onClick={() => setMobileOpen(false)}
              className="block px-2 py-2 text-foreground hover:text-primary"
            >
              About Us
            </Link>

            {user && (
              <>
                <Link
                  to="/attendance"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 text-foreground hover:text-primary"
                >
                  Daily Reporting
                </Link>

                <Link
                  to="/leave"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 text-foreground hover:text-primary"
                >
                  Apply Leave
                </Link>

                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 text-foreground hover:text-primary"
                >
                  Dashboard
                </Link>
              </>
            )}

            {!user && (
              <Button onClick={handleAuthAction} className="mt-3 w-full">
                Login
              </Button>
            )}
          </div>
        )}
      </nav>

      <FcmTokenModal
        isOpen={showFcmModal}
        onClose={() => setShowFcmModal(false)}
      />
      <div className="pt-20" />
    </>
  );
}

Navbar.propTypes = {
  brand: PropTypes.string,
};
