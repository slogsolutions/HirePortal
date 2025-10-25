import React, { useState, useEffect, useContext } from "react";
import { Sun, Moon, Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import FcmTokenModal from "./FcmTokenModal";

const Navbar = () => {
  const [isDark, setIsDark] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Toggle dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const handleAuthAction = () => {
    if (user) {
      logout();
      navigate("/"); // send them home after logout
    } else {
      navigate("/login");
    }
  };

  const [showFcmModal, setShowFcmModal] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo / Brand */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Slog Solutions
        </h1>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6 items-center">
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
          
          {user && (<Link
            to="/notifications"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
          >
            Notifications
          </Link>)}

            {user && (<Link
            to="/attendance"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
          >
            Daily Reporting
          </Link>)}
  

         
          {/* <Link
            to="/leaveApproval"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
          >
            Approve Leave
          </Link> */}

           <Link
            to="/dashboard"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
          >
            Dashboard
          </Link>

         {user && ( <Link
            to="/leave"
            className="text-gray-800 dark:text-gray-200 hover:text-blue-500"
          >
            Apply Leave
          </Link>)}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Save FCM Token Button (visible when logged in) */}
          {user && (
            <button
              onClick={() => setShowFcmModal(true)}
              className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700"
            >
              Save FCM Token
            </button>
          )}

          {/* Login/Logout Button */}
          <button
            onClick={handleAuthAction}
            className={`px-4 py-2 rounded-lg text-white ${
              user ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {user ? "Logout" : "Login"}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-gray-800 dark:text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 px-4 py-3 space-y-3">
          <Link
            to="/"
            className="block text-gray-800 dark:text-gray-200 hover:text-blue-500"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <a
            href="#about"
            className="block text-gray-800 dark:text-gray-200 hover:text-blue-500"
            onClick={() => setIsOpen(false)}
          >
            About
          </a>

          <Link
            to="/notifications"
            className="block text-gray-800 dark:text-gray-200 hover:text-blue-500"
            onClick={() => setIsOpen(false)}
          >
            Notifications
          </Link>

          <button
            onClick={() => setIsDark(!isDark)}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-200 dark:bg-gray-700"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>

          {/* Mobile Login/Logout */}
          <button
            onClick={() => {
              handleAuthAction();
              setIsOpen(false);
            }}
            className={`w-full px-4 py-2 rounded-lg text-white ${
              user ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
            }`}
          >
            {user ? "Logout" : "Login"}
          </button>
        </div>
      )}
      <FcmTokenModal isOpen={showFcmModal} onClose={() => setShowFcmModal(false)} />
    </nav>
  );
};

export default Navbar;
