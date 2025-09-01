import React, { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Wallet,
  BarChart2,
  User,
  Settings,
  PlusCircle,
  DollarSign,
  LogOut,
  MessageCircle,
  History as HistoryIcon,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";  // ✅ add router support

const Sidebar = ({ isOpen, onToggle }) => {
  const [activeItem, setActiveItem] = useState("dashboard");
  const { logout } = useAuth();
  const [indicatorTop, setIndicatorTop] = useState(0);
  const navRefs = useRef({});
  const location = useLocation(); // ✅ track URL

  const toggleSidebar = () => {
    if (onToggle) onToggle();
  };

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/budget" },
    { id: "budget", label: "Budget", icon: Wallet, path: "/dashboard/budget" },
    { id: "history", label: "History", icon: HistoryIcon, path: "/dashboard/history" },
    { id: "settings", label: "Settings", icon: Settings, path: "/dashboard/settings" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
  ];

  const quickActions = [
    { id: "add-expense", label: "Add Expense", icon: PlusCircle, path: "/dashboard/budget" },
    { id: "add-income", label: "Add Income", icon: DollarSign, path: "/dashboard/budget" },
  ];

  // ✅ Sync active state with URL
  useEffect(() => {
    const current = navigationItems.find(item => location.pathname.startsWith(item.path));
    if (current) setActiveItem(current.id);
  }, [location.pathname]);

  useEffect(() => {
    if (navRefs.current[activeItem]) {
      setIndicatorTop(navRefs.current[activeItem].offsetTop);
    }
  }, [activeItem, isOpen]);

  return (
    <>
      {/* Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-300 cursor-pointer active:opacity-50"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-80 bg-white border-r border-emerald-200 shadow-xl flex flex-col transform transition-all duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:w-72 md:w-80`}
      >
        {/* Header */}
        <div className="p-4 border-b border-emerald-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-emerald-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <img src="/logo.svg" alt="AI Finance Tracker" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-emerald-900">AI FINANCE TRACKER</h1>
              <p className="text-xs text-emerald-700 font-medium">Smart Money Manager</p>
            </div>
          </div>

          {/* Close Button for Mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-xl p-2 lg:hidden border border-emerald-200 hover:border-emerald-300 transition-all duration-200 click-anim active:scale-95"
            onClick={toggleSidebar}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Quick Actions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((item) => (
                <Link key={item.id} to={item.path}>
                  <Button
                    variant={"outline"}
                    size="sm"
                    className={`w-full justify-start text-sm rounded-lg py-3 transition-all duration-200 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 click-anim active:scale-95`}
                  >
                    <item.icon className="mr-3 w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Navigation</h3>
            <div className="relative space-y-1">
              {/* Active Indicator */}
              <div
                className="absolute left-0 w-1 h-12 bg-emerald-600 rounded-full transition-all duration-300"
                style={{ top: indicatorTop + 4 }}
              />
              {navigationItems.map((item) => (
                <Link key={item.id} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center space-x-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ml-3 click-anim active:scale-95 ${
                      activeItem === item.id
                        ? "bg-emerald-100 text-emerald-800 border-l-2 border-emerald-600 font-semibold shadow-sm"
                        : "text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                    }`}
                    onClick={() => setActiveItem(item.id)}
                    ref={(el) => (navRefs.current[item.id] = el)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Promo / Info Card */}
          <div className="card animate-slide-up">
            <div className="text-sm text-slate-700 font-medium">Tip</div>
            <p className="text-slate-600 mt-1">Use Quick Actions to add expenses or income faster.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-emerald-200 bg-emerald-50 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full flex items-center gap-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg click-anim"
          >
            <MessageCircle className="w-5 h-5" />
            Contact Support
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg click-anim"
            onClick={logout}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Toggle Buttons */}
      {!isOpen && (
        <Button
          variant="default"
          size="md"
          className="fixed top-4 left-4 z-50 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl p-3 shadow-xl border-2 border-emerald-500 hover:border-emerald-400 transition-all duration-300 hover:scale-105 click-anim active:scale-95"
          onClick={toggleSidebar}
        >
          <div className="flex items-center space-x-2">
            <img src="/logo.svg" alt="Menu" className="w-5 h-5" />
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5h.01M12 12h.01M12 19h.01" />
            </svg>
          </div>
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className={`hidden lg:block fixed top-4 z-40 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-xl p-3 transition-all duration-300 border border-emerald-300 hover:border-emerald-600 hover:shadow-md click-anim active:scale-95 ${
          isOpen ? "left-72" : "left-4"
        }`}
        onClick={toggleSidebar}
      >
        <svg
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </>
  );
};

export default Sidebar;
