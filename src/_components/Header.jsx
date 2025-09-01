import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Avatar from "../components/ui/Avatar";
import { Button } from "../components/ui/button";
import { User, Settings, HelpCircle, LogOut, ChevronDown, ArrowLeft } from "lucide-react"; // icons

const Header = ({ onMenuToggle, sidebarOpen }) => {
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef();

  const navigate = useNavigate();
  const location = useLocation();
  const [canGoBack, setCanGoBack] = useState(true);
  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, [location]);

  const handleLogout = () => logout();

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 w-full z-50">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ---------- Left Section ---------- */}
        <div className="flex items-center gap-18">
          {/* Sidebar Toggle Button */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
            onClick={onMenuToggle}
          >
            <span className="sr-only">Open sidebar</span>
            {sidebarOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-md border border-gray-200 click-anim"
            onClick={() => navigate(-1)}
            disabled={!canGoBack}
            aria-label="Go back"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Title */}
        <div className="app-title text-4xl font-bold">FinTrackr</div>

        {/* ---------- Right Section (Profile Dropdown) ---------- */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center space-x-2 focus:outline-none"
          >
            <Avatar
              src={currentUser?.profilePhoto}
              alt="Profile"
              initials={`${currentUser?.firstName?.[0] || ""}${currentUser?.lastName?.[0] || ""}`}
              size="lg" // reduced size
              ring
              ringColor="teal"
              status="online"
            />
            <ChevronDown
              className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-xl py-3 z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">
                  {currentUser?.firstName} {currentUser?.lastName || "User"}
                </p>
                <p className="text-xs text-gray-600 truncate w-56">
                  {currentUser?.email || "user@example.com"}
                </p>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-md transition"
                >
                  <User className="h-5 w-5 text-gray-500" />
                  Profile
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition"
                >
                  <Settings className="h-5 w-5 text-gray-500" />
                  Settings
                </Link>

                <Link
                  to="/help"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-md transition"
                >
                  <HelpCircle className="h-5 w-5 text-gray-500" />
                  Help & Support
                </Link>
              </div>

              {/* Logout */}
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100 rounded-lg font-medium"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
