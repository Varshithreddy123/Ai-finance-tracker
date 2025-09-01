import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const loadState = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function Hero() {
  const [granularity, setGranularity] = useState("day"); // 'day' | 'month' | 'year'
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dataKey, setDataKey] = useState("fat_budget_guest_v1"); // replaced after mount using user data if needed

  // On mount, detect last used key from Auth-based pattern if available in storage
  useEffect(() => {
    // Pick the most recently modified key that matches our key pattern
    const keys = Object.keys(localStorage).filter(k => k.startsWith("fat_budget_"));
    if (keys.length) {
      // Reduce to the last touched by checking last write via JSON include of a timestamp if present; otherwise pick the first
      setDataKey(keys[0]);
    }
  }, []);

  const raw = useMemo(() => loadState(dataKey) || { totalBudget: 0, expenses: [] }, [dataKey]);

  const series = useMemo(() => {
    const expenses = Array.isArray(raw.expenses) ? raw.expenses : [];

    // Normalize date
    const parseDate = (d) => {
      if (!d) return null;
      const t = Date.parse(d);
      return Number.isNaN(t) ? null : new Date(t);
    };

    // Filter by range
    const inRange = (dt) => {
      const t = dt?.getTime?.() || 0;
      const f = from ? Date.parse(from) : null;
      const tt = to ? Date.parse(to) : null;
      if (f && t < f) return false;
      if (tt && t > tt) return false;
      return true;
    };

    // Grouping helpers
    const keyBy = (dt) => {
      if (!dt) return "unknown";
      if (granularity === "year") return String(dt.getFullYear());
      if (granularity === "month") return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      // default day
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    };

    const map = new Map();
    for (const e of expenses) {
      const dt = parseDate(e.date || e.created_at);
      if (!dt || !inRange(dt)) continue;
      const key = keyBy(dt);
      const cur = map.get(key) || { key, spent: 0, count: 0 };
      cur.spent += Number(e.amount || 0);
      cur.count += 1;
      map.set(key, cur);
    }

    const res = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    return res;
  }, [raw, from, to, granularity]);

  // All filtered expenses (by date range) for the table
  const filteredExpenses = useMemo(() => {
    const expenses = Array.isArray(raw.expenses) ? raw.expenses : [];
    const parseDate = (d) => {
      if (!d) return null;
      const t = Date.parse(d);
      return Number.isNaN(t) ? null : new Date(t);
    };
    const inRange = (dt) => {
      const t = dt?.getTime?.() || 0;
      const f = from ? Date.parse(from) : null;
      const tt = to ? Date.parse(to) : null;
      if (f && t < f) return false;
      if (tt && t > tt) return false;
      return true;
    };
    return expenses
      .map((e) => ({
        ...e,
        _date: parseDate(e.date || e.created_at),
      }))
      .filter((e) => e._date && inRange(e._date))
      .sort((a, b) => (b._date?.getTime?.() || 0) - (a._date?.getTime?.() || 0));
  }, [raw, from, to]);

  // Category totals for badges
  const categoryTotals = useMemo(() => {
    const map = new Map();
    for (const e of filteredExpenses) {
      const key = e.category || 'Other';
      const cur = map.get(key) || { label: key, amount: 0, count: 0 };
      cur.amount += Number(e.amount || 0);
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  // Choose top categories to show as separate lines
  const topCategories = useMemo(() => categoryTotals.slice(0, 4).map(c => c.label), [categoryTotals]);
  const chartColors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"]; // pool for lines

  // Build time series including per-category amounts for top categories
  const seriesWithCats = useMemo(() => {
    const expenses = Array.isArray(raw.expenses) ? raw.expenses : [];
    const parseDate = (d) => {
      if (!d) return null;
      const t = Date.parse(d);
      return Number.isNaN(t) ? null : new Date(t);
    };
    const inRange = (dt) => {
      const t = dt?.getTime?.() || 0;
      const f = from ? Date.parse(from) : null;
      const tt = to ? Date.parse(to) : null;
      if (f && t < f) return false;
      if (tt && t > tt) return false;
      return true;
    };
    const keyBy = (dt) => {
      if (!dt) return "unknown";
      if (granularity === "year") return String(dt.getFullYear());
      if (granularity === "month") return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    };

    const map = new Map();
    for (const e of expenses) {
      const dt = parseDate(e.date || e.created_at);
      if (!dt || !inRange(dt)) continue;
      const key = keyBy(dt);
      const cur = map.get(key) || { key, spent: 0 };
      cur.spent += Number(e.amount || 0);
      const cat = e.category || 'Other';
      if (topCategories.includes(cat)) {
        cur[cat] = (cur[cat] || 0) + Number(e.amount || 0);
      }
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [raw, from, to, granularity, topCategories]);

  return (
    <section className="bg-white lg:grid lg:h-screen lg:place-content-center">
      <div className="mx-auto w-screen max-w-screen-xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-prose text-center">
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
            Smart financial insights with
            <strong className="text-emerald-600"> AI-powered </strong>
            analytics
          </h1>

          <p className="mt-4 text-base text-slate-700 sm:text-lg leading-relaxed max-w-xl mx-auto">
            Harness AI-powered analytics to optimize your finances and significantly boost your savings.
          </p>

          {/* Controls */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">View by:</label>
              <select value={granularity} onChange={(e) => setGranularity(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2">
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2" />
              <label className="text-sm text-slate-600">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2" />
            </div>
          </div>

          {/* Chart */}
          <div className="mt-6 w-full card animate-slide-up" style={{ height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesWithCats} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="key" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="spent" name="Total Spent" stroke="#ef4444" strokeWidth={2} dot={false} />
                {topCategories.map((cat, i) => (
                  <Line key={cat}
                        type="monotone"
                        dataKey={cat}
                        name={cat}
                        stroke={chartColors[i % chartColors.length]}
                        strokeWidth={2}
                        dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category Summary */}
          <div className="mt-6 card animate-slide-up">
            <div className="card-header">
              <h3 className="card-title">Categories</h3>
            </div>
            {categoryTotals.length === 0 ? (
              <div className="text-slate-500">No expenses in the selected range.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categoryTotals.map((c) => (
                  <span key={c.label} className="badge-soft">
                    {c.label}: {c.amount.toLocaleString()} ({c.count})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* All Expenses Table */}
          <div className="mt-6 card animate-slide-up">
            <div className="card-header">
              <h3 className="card-title">All Expenses</h3>
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="text-slate-500">No expenses to display for the selected filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm rounded-xl overflow-hidden shadow-sm table-ui table-striped">
                  <thead>
                    <tr className="text-emerald-800 bg-emerald-50">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((e, idx) => (
                      <tr key={e.id || idx} className="border-t hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600">{e.date || (e.created_at ? new Date(e.created_at).toLocaleDateString() : '—')}</td>
                        <td className="py-2 px-3 text-slate-800">{e.label}</td>
                        <td className="py-2 px-3"><span className="badge badge-secondary">{e.category || 'Other'}</span></td>
                        <td className="py-2 px-3 font-medium">{Number(e.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
