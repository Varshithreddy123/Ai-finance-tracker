import React, { useCallback, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";  
import { useAuth } from "./contexts/AuthContext";
import Header from "./_components/Header";
import Footer from "./_components/Footer";
import Hero from "./_components/Hero";
import Sidebar from "./_components/Sidebar";
import Auth from "./components/auth/Auth";
import Dashboard from "./pages/Dashboard";
import UserProfile from "./components/auth/UserProfile"; // ✅ Updated
import Budget from "./pages/Budget";
import AiInsights from "./pages/AiInsights";
import History from "./pages/History";

const AppContent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentUser, loading } = useAuth();

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-emerald-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6">
            <img src="/logo.svg" alt="Loading" className="w-8 h-8 animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Loading AI Finance Tracker...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Auth />;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />

      <div className="flex-1 flex flex-col min-h-screen">
        <Header onMenuToggle={handleMenuToggle} sidebarOpen={sidebarOpen} />

        <main className="flex-grow">
          <Routes>
            <Route
              path="/"
              element={
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                  <h1 className="text-center text-3xl md:text-4xl font-bold text-foreground mb-8">
                    Welcome back, {currentUser.firstName}!
                  </h1>
                  <div className="text-center space-y-4">
                    <p className="text-lg text-muted-foreground">
                      Your AI Finance Tracker is ready to help you manage your finances.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link
                        to="/dashboard/budget"
                        className="inline-flex items-center px-8 py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                      >
                        Go to Dashboard →
                      </Link>
                      <Link
                        to="/profile"
                        className="inline-flex items-center px-8 py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-semibold text-lg transition-all duration-200 border border-slate-300"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                  <Hero />
                </div>
              }
            />

            {/* Dashboard nested routes */}
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<Budget />} />
              <Route path="budget" element={<Budget />} />
              <Route path="reports" element={<div>📊 Reports Page</div>} />
              <Route path="history" element={<History />} />
              <Route path="settings" element={<div>⚙️ Settings Page</div>} />
            </Route>

            {/* User Profile page */}
            <Route path="/profile" element={<UserProfile />} />

            {/* AI Insights page */}
            <Route path="/ai-insights" element={<AiInsights />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </div>
  );
};

const App = () => <AppContent />;

export default App;
