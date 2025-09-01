import React, { useEffect, useMemo, useState } from "react";
import PieChart from "../components/PieChart";
import { useAuth } from "../contexts/AuthContext";
import { Wallet, Receipt, PiggyBank, Filter, PlusCircle } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_URL || "";

// Local storage helpers (mock persistence) - per-user
const loadState = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const saveState = (key, state) => {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
};

export default function History() {
  const { token, currentUser } = useAuth();
  const storageKey = useMemo(() => currentUser ? `fat_budget_${currentUser.id}_v1` : 'fat_budget_guest_v1', [currentUser]);

  const [totalBudget, setTotalBudget] = useState(0);
  const [expenses, setExpenses] = useState([]);

  // Add form
  const [form, setForm] = useState({ label: "", amount: "", category: "General", date: "" });

  // Filters
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // Load from local cache for this user (or guest)
  useEffect(() => {
    const cached = loadState(storageKey);
    if (cached && typeof cached === 'object') {
      setTotalBudget(Number(cached.totalBudget || 0));
      setExpenses(Array.isArray(cached.expenses) ? cached.expenses : []);
    }
  }, [storageKey]);

  // Load user-specific budget/expenses when logged in
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!token) return; // keep local state for guests
      try {
        const resp = await fetch(`${API_BASE}/api/budget`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return; // fallback to local state
        const data = await resp.json();
        if (!isMounted) return;
        const tb = Number(data?.totalBudget || 0);
        const ex = Array.isArray(data?.expenses) ? data.expenses : [];
        setTotalBudget(tb);
        setExpenses(ex);
        saveState(storageKey, { totalBudget: tb, expenses: ex }); // keep a local copy as cache
      } catch {}
    };
    load();
    return () => { isMounted = false; };
  }, [token, storageKey]);

  const categories = useMemo(() => {
    const set = new Set(expenses.map(e => e.category || "Other"));
    return ["All", ...Array.from(set)];
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const labelOk = !query || (e.label || "").toLowerCase().includes(query.toLowerCase());
      const categoryOk = category === "All" || (e.category || "Other") === category;
      const dStr = e.date || e.created_at;
      const dOk = (() => {
        if (!start && !end) return true;
        const t = dStr ? Date.parse(dStr) : NaN;
        if (Number.isNaN(t)) return false;
        const sOk = start ? t >= Date.parse(start) : true;
        const eOk = end ? t <= Date.parse(end) : true;
        return sOk && eOk;
      })();
      return labelOk && categoryOk && dOk;
    });
  }, [expenses, query, category, start, end]);

  const totalSpent = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount || 0), 0), [filtered]);

  const categoryData = useMemo(() => {
    const map = new Map();
    filtered.forEach((e) => {
      const key = e.category || "Other";
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [filtered]);

  const onAddExpense = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.label || !amount || amount <= 0) return;

    if (token) {
      try {
        const resp = await fetch(`${API_BASE}/api/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ label: form.label, category: form.category || 'General', amount, date: form.date || undefined }),
        });
        const item = await resp.json();
        const next = [ ...expenses, item ];
        setExpenses(next);
        saveState(storageKey, { totalBudget, expenses: next });
      } catch {
        const next = [ ...expenses, { id: Date.now(), label: form.label, amount, category: form.category || 'General', created_at: form.date || new Date().toISOString() } ];
        setExpenses(next);
        saveState(storageKey, { totalBudget, expenses: next });
      }
    } else {
      const next = [ ...expenses, { id: Date.now(), label: form.label, amount, category: form.category || 'General', created_at: form.date || new Date().toISOString() } ];
      setExpenses(next);
      saveState(storageKey, { totalBudget, expenses: next });
    }

    setForm({ label: "", amount: "", category: "General", date: "" });
  };

  const onDelete = async (id) => {
    if (token) {
      try {
        await fetch(`${API_BASE}/api/expenses/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    saveState(storageKey, { totalBudget, expenses: next });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-emerald-700">History</h1>
        <div className="text-sm text-slate-500">{filtered.length} records • {new Intl.NumberFormat().format(totalSpent)} spent</div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Budget</div>
              <div className="text-2xl font-semibold text-slate-800">{Number(totalBudget || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#fee2e2', color: '#b91c1c' }}>
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Spent (filtered)</div>
              <div className="text-2xl font-semibold text-rose-600">{totalSpent.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7', color: '#047857' }}>
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Categories</div>
              <div className="text-2xl font-semibold text-slate-800">{categoryData.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2"><PlusCircle className="w-5 h-5 text-emerald-600" /> Add Expense</h2>
          </div>
          <form onSubmit={onAddExpense} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="input input-soft"
              placeholder="Expense name"
            />
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="input input-soft"
              placeholder="Amount"
              min="0"
            />
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input input-soft"
              placeholder="Category"
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="input input-soft"
            />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title flex items-center gap-2"><Filter className="w-5 h-5 text-slate-600" /> Filters</h2>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input input-soft"
              placeholder="Search label..."
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input input-soft">
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="input input-soft" />
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="input input-soft" />
            </div>
          </div>
        </div>
      </div>

      {/* Table + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="card-title">Expense History</h2>
          </div>
          {filtered.length === 0 ? (
            <div className="text-slate-500">No expenses for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm rounded-xl overflow-hidden shadow-sm table-ui table-striped">
                <thead>
                  <tr className="text-emerald-800 bg-emerald-50">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice() // shallow copy before sort
                    .sort((a, b) => {
                      const da = a.date || a.created_at;
                      const db = b.date || b.created_at;
                      const ta = da ? Date.parse(da) : 0;
                      const tb = db ? Date.parse(db) : 0;
                      return tb - ta;
                    })
                    .map((e) => (
                      <tr key={e.id} className="border-t hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600">{e.date || (e.created_at ? new Date(e.created_at).toLocaleDateString() : '—')}</td>
                        <td className="py-2 px-3 text-slate-800">{e.label}</td>
                        <td className="py-2 px-3"><span className="badge badge-secondary">{e.category || 'Other'}</span></td>
                        <td className="py-2 px-3 font-medium">{Number(e.amount).toLocaleString()}</td>
                        <td className="py-2 px-3">
                          <button onClick={() => onDelete(e.id)} className="btn btn-destructive btn-sm">Delete</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Category Breakdown</h2>
          </div>
          {categoryData.length === 0 ? (
            <div className="text-slate-500">No data to display.</div>
          ) : (
            <PieChart data={categoryData} size={260} />
          )}
        </div>
      </div>
    </div>
  );
}
