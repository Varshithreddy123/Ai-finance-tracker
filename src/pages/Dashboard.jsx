import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Wallet,
  Receipt,
  PiggyBank,
  BarChart2,
  History as HistoryIcon,
  ArrowRight,
} from "lucide-react";

// Local storage helpers (keep parity with Budget page cache)
const loadState = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function Dashboard() {
  const { currentUser } = useAuth();
  const storageKey = useMemo(
    () => (currentUser ? `fat_budget_${currentUser.id}_v1` : "fat_budget_guest_v1"),
    [currentUser]
  );

  const [totalBudget, setTotalBudget] = useState(0);
  const [expenses, setExpenses] = useState([]);

  // Load snapshot from cache for quick dashboard metrics
  useEffect(() => {
    const cached = loadState(storageKey);
    if (cached && typeof cached === "object") {
      setTotalBudget(Number(cached.totalBudget || 0));
      setExpenses(Array.isArray(cached.expenses) ? cached.expenses : []);
    }
  }, [storageKey]);

  // Live updates: listen for custom events, storage changes, and poll as a fallback
  useEffect(() => {
    const onBudgetUpdated = (e) => {
      const payload = e.detail || {};
      if (typeof payload.totalBudget !== 'undefined') setTotalBudget(Number(payload.totalBudget || 0));
      if (Array.isArray(payload.expenses)) setExpenses(payload.expenses);
    };
    window.addEventListener('budget:updated', onBudgetUpdated);

    const onStorage = (ev) => {
      if (ev.key === storageKey && ev.newValue) {
        try {
          const parsed = JSON.parse(ev.newValue);
          setTotalBudget(Number(parsed.totalBudget || 0));
          setExpenses(Array.isArray(parsed.expenses) ? parsed.expenses : []);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    let last = null;
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw && raw !== last) {
          last = raw;
          const parsed = JSON.parse(raw);
          setTotalBudget(Number(parsed.totalBudget || 0));
          setExpenses(Array.isArray(parsed.expenses) ? parsed.expenses : []);
        }
      } catch {}
    }, 1000);

    return () => {
      window.removeEventListener('budget:updated', onBudgetUpdated);
      window.removeEventListener('storage', onStorage);
      clearInterval(poll);
    };
  }, [storageKey]);

  const spent = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses]
  );
  const remaining = Math.max(0, Number(totalBudget || 0) - spent);

  const categories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category || "Other"));
    return Array.from(set);
  }, [expenses]);

  const recentExpenses = useMemo(() => {
    const copy = [...expenses];
    // sort by created_at if present, falling back to id
    copy.sort((a, b) => {
      const da = a.created_at ? Date.parse(a.created_at) : 0;
      const db = b.created_at ? Date.parse(b.created_at) : 0;
      if (db !== da) return db - da;
      return (b.id || 0) - (a.id || 0);
    });
    return copy.slice(0, 5);
  }, [expenses]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-emerald-700">Dashboard</h1>
        <div className="text-sm text-slate-500">
          {currentUser ? `Welcome, ${currentUser.firstName || "User"}` : "Guest session"}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: "var(--color-blue-100)", color: "var(--color-blue-700)" }}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Total Budget</div>
              <div className="text-2xl font-semibold text-slate-800">{Number(totalBudget || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="card animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}>
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Spent</div>
              <div className="text-2xl font-semibold text-rose-600">{spent.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="card animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: "var(--color-green-100)", color: "var(--color-green-700)" }}>
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Remaining (Savings)</div>
              <div className="text-2xl font-semibold text-emerald-600">{remaining.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="card animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                 style={{ backgroundColor: "#e0e7ff", color: "#3730a3" }}>
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Categories</div>
              <div className="text-2xl font-semibold text-slate-800">{categories.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Expenses Table */}
      <div className="card animate-slide-up">
        <div className="flex items-center justify-between card-header">
          <h2 className="card-title flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            Recent Expenses
          </h2>
          <div className="flex items-center gap-2">
            <Link to="/dashboard/budget" className="btn btn-outline">
              Go to Budget <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link to="/dashboard/history" className="btn btn-secondary">
              <HistoryIcon className="w-4 h-4 mr-2" /> View History
            </Link>
          </div>
        </div>
        {recentExpenses.length === 0 ? (
          <div className="text-slate-500">No recent expenses. Add some from the Budget page.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm rounded-xl overflow-hidden shadow-sm table-ui table-striped">
              <thead>
                <tr className="text-emerald-800 bg-emerald-50">
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-800">{e.label}</td>
                    <td className="py-2 px-3"><span className="badge badge-secondary">{e.category || "Other"}</span></td>
                    <td className="py-2 px-3 font-medium">{Number(e.amount).toLocaleString()}</td>
                    <td className="py-2 px-3 text-slate-500">{e.created_at ? new Date(e.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
