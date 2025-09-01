import React, { useEffect, useMemo, useState } from "react";
import PieChart from "../components/PieChart";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Wallet, Receipt, PiggyBank } from "lucide-react";

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

export default function Budget() {
  const initial = {
    totalBudget: 2000,
    expenses: [
      { id: 1, label: "Rent", amount: 800, category: "Housing" },
      { id: 2, label: "Groceries", amount: 250, category: "Food" },
    ],
  };

  const [totalBudget, setTotalBudget] = useState(initial.totalBudget);
  const [expenses, setExpenses] = useState(initial.expenses);
  const [form, setForm] = useState({ label: "", amount: "", category: "General", date: "" });
  const { token, currentUser } = useAuth();
  const [ai, setAi] = useState({ loading: false, text: "" });

  // Natural-language quick entry
  const [nl, setNl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null); // { label, category, amount, type, occurred_at }
  const [parseError, setParseError] = useState("");
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddMsg, setQuickAddMsg] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("All");
  const storageKey = useMemo(() => currentUser ? `fat_budget_${currentUser.id}_v1` : 'fat_budget_guest_v1', [currentUser]);

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

  const spent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount || 0), 0), [expenses]);
  const remaining = Math.max(0, Number(totalBudget || 0) - spent);

  const categoryData = useMemo(() => {
    const map = new Map();
    expenses.forEach((e) => {
      const key = e.category || "Other";
      map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [expenses]);

  const categories = useMemo(() => {
    const set = new Set(expenses.map(e => e.category || "Other"));
    return ["All", ...Array.from(set)];
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === "All") return expenses;
    return expenses.filter(e => (e.category || "Other") === categoryFilter);
  }, [expenses, categoryFilter]);

  const chartData = useMemo(() => {
    return [
      { label: "Spent", value: spent, color: "#ef4444" },
      { label: "Remaining", value: remaining, color: "#10b981" },
    ];
  }, [spent, remaining]);

  const aiSuggestion = useMemo(() => {
    if (!totalBudget || totalBudget <= 0) return "Set a valid total budget to get insights.";
    const pct = spent / totalBudget;
    if (pct < 0.5) return "Good job! You're under 50% of your budget. Consider saving or investing the surplus.";
    if (pct < 0.85) return "You're within a safe range. Monitor recurring categories like Food or Transport to optimize further.";
    const topCategory = categoryData.sort((a, b) => b.value - a.value)[0];
    return `Warning: Spending is high (${Math.round(pct * 100)}% of budget). Biggest category: ${topCategory?.label || "N/A"}. Try setting a weekly cap or switching to lower-cost alternatives.`;
  }, [spent, totalBudget, categoryData]);

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
        window.dispatchEvent(new CustomEvent('budget:updated', { detail: { totalBudget, expenses: next } }));
      } catch {
        const next = [ ...expenses, { id: Date.now(), label: form.label, amount, category: form.category || 'General', created_at: form.date || new Date().toISOString() } ];
        setExpenses(next);
        saveState(storageKey, { totalBudget, expenses: next });
        window.dispatchEvent(new CustomEvent('budget:updated', { detail: { totalBudget, expenses: next } }));
      }
    } else {
      const next = [ ...expenses, { id: Date.now(), label: form.label, amount, category: form.category || 'General', created_at: form.date || new Date().toISOString() } ];
      setExpenses(next);
      saveState(storageKey, { totalBudget, expenses: next });
      window.dispatchEvent(new CustomEvent('budget:updated', { detail: { totalBudget, expenses: next } }));
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
    window.dispatchEvent(new CustomEvent('budget:updated', { detail: { totalBudget, expenses: next } }));
  };

  const onBudgetChange = async (v) => {
    const value = Number(v) || 0;
    setTotalBudget(value);
    saveState(storageKey, { totalBudget: value, expenses });
    window.dispatchEvent(new CustomEvent('budget:updated', { detail: { totalBudget: value, expenses } }));
    if (token) {
      try {
        await fetch(`${API_BASE}/api/budget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ totalBudget: value }),
        });
      } catch {}
    }
  };

  // Client-side NLP fallback parser with Electronics support
  const clientParse = (text) => {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase();
    const amtMatch = lower.match(/([+-]?\$?\d+(?:\.\d{1,2})?)/);
    if (!amtMatch) return null;
    let amt = Number(amtMatch[1].replace('$', ''));

    let type = null;
    if (amt < 0 || /(spent|paid|buy|bought|expense|minus|withdraw)/.test(lower)) type = 'expense';
    if (amt > 0 && (/(income|salary|earned|deposit|plus|credit|received)/.test(lower) || /^\+/.test(amtMatch[1]))) type = 'income';
    if (!type) type = 'expense';
    amt = Math.abs(amt);

    let category = 'General';
    if (/(food|grocery|lunch|dinner|restaurant|coffee)/.test(lower)) category = 'Food';
    else if (/(transport|uber|bus|train|fuel|gas|petrol|taxi)/.test(lower)) category = 'Transport';
    else if (/(rent|mortgage|utilities|electric|water|internet)/.test(lower)) category = 'Housing';
    else if (/(salary|paycheck|bonus|freelance|client|invoice)/.test(lower)) category = 'Income';
    else if (/(shopping|clothes|amazon|store)/.test(lower)) category = 'Shopping';
    else if (/(electronics|phone|laptop|watch|tablet|headphones|camera|tv|television|samsung|apple|sony|xiaomi|pixel|oneplus)/.test(lower)) category = 'Electronics';

    return { label: text.trim(), category, amount: amt, type, occurred_at: new Date().toISOString() };
  };

  // Parse NL text using server (Gemini when available), else client fallback
  const parseText = async (text) => {
    let data = null;
    if (token) {
      try {
        const resp = await fetch(`${API_BASE}/api/transactions/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text })
        });
        if (resp.ok) data = await resp.json();
      } catch {}
    }
    if (!data) data = clientParse(text);
    if (!data) return null;
    // Prefer client Electronics category if server returned General
    const fallback = clientParse(text);
    return { ...data, category: fallback?.category || data.category || 'General' };
  };

  const onParse = async () => {
    setParseError("");
    setParsing(true);
    try {
      const data = await parseText(nl);
      if (!data) {
        setParsed(null);
        setParseError('Unable to parse input. Try clarifying the text.');
      } else {
        setParsed(data);
      }
    } finally {
      setParsing(false);
    }
  };

  // Confirm and create transaction; update expenses only for expense type
  const onConfirmParsed = async () => {
    if (!parsed) return;
    await createFromParsed(parsed);
    setParsed(null);
    setNl("");
  };

  const createFromParsed = async (data) => {
    if (!data) return;
    if (token) {
      try {
        const resp = await fetch(`${API_BASE}/api/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            label: data.label,
            category: data.category || 'General',
            amount: data.amount,
            type: data.type || 'expense',
            date: data.occurred_at || undefined,
          }),
        });
        const r = await resp.json();
        if ((r.type || data.type) === 'expense') {
          const exp = { id: r.id || Date.now(), label: r.label || data.label, category: r.category || data.category, amount: Number(r.amount || data.amount), created_at: r.occurred_at || data.occurred_at };
          const next = [...expenses, exp];
          setExpenses(next);
          saveState(storageKey, { totalBudget, expenses: next });
          window.dispatchEvent(new CustomEvent('budget:updated', { detail: { totalBudget, expenses: next } }));
        }
      } catch {
        const exp = { id: Date.now(), label: data.label, category: data.category || 'General', amount: Number(data.amount), created_at: data.occurred_at };
        const next = [...expenses, exp];
        setExpenses(next);
        saveState(storageKey, { totalBudget, expenses: next });
        window.dispatchEvent(new CustomEvent('budget:updated', { detail: { totalBudget, expenses: next } }));
      }
    } else {
      const exp = { id: Date.now(), label: data.label, category: data.category || 'General', amount: Number(data.amount), created_at: data.occurred_at };
      const next = [...expenses, exp];
      setExpenses(next);
      saveState(storageKey, { totalBudget, expenses: next });
      window.dispatchEvent(new CustomEvent('budget:updated', { detail: { totalBudget, expenses: next } }));
    }
  };

  // One-step quick add (Enter or button): parse then create
  const onQuickAdd = async () => {
    if (!nl.trim() || quickAddLoading) return;
    setQuickAddMsg("");
    setParseError("");
    setQuickAddLoading(true);
    try {
      const data = await parseText(nl);
      if (!data) {
        setParseError('Unable to parse input. Try including an amount, e.g., "$250".');
        return;
      }
      await createFromParsed(data);
      setQuickAddMsg(`Added: ${data.label} - $${Number(data.amount).toLocaleString()} (${data.category || 'General'})`);
      setNl("");
      setParsed(null);
      // auto-hide success message
      setTimeout(() => setQuickAddMsg("") , 3000);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const onUseInForm = () => {
    if (!parsed) return;
    setForm({
      label: parsed.label || '',
      amount: parsed.amount != null ? String(parsed.amount) : '',
      category: parsed.category || 'General',
      date: parsed.occurred_at ? parsed.occurred_at.slice(0,10) : ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-emerald-700">Budget</h1>
       <Link to="/ai-insights">
      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-orange-400 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300"
      >
        <span className="hidden sm:inline">AI Insights</span>
        <span role="img" aria-label="sparkles" className="w-5 h-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            fill="currentColor"
            className="w-6 h-6"
          >
            <radialGradient
              id="grad1"
              cx="-670.437"
              cy="617.13"
              r=".041"
              gradientTransform="matrix(128.602 652.9562 653.274 -128.6646 -316906.281 517189.719)"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#1ba1e3" />
              <stop offset=".3" stopColor="#5489d6" />
              <stop offset=".545" stopColor="#9b72cb" />
              <stop offset=".825" stopColor="#d96570" />
              <stop offset="1" stopColor="#f49c46" />
            </radialGradient>
            <path
              fill="url(#grad1)"
              d="M22.882,31.557l-1.757,4.024c-0.675,1.547-2.816,1.547-3.491,0l-1.757-4.024
              c-1.564-3.581-4.378-6.432-7.888-7.99l-4.836-2.147c-1.538-0.682-1.538-2.919,0-3.602l4.685-2.08
              c3.601-1.598,6.465-4.554,8.002-8.258l1.78-4.288c0.66-1.591,2.859-1.591,3.52,0l1.78,4.288c1.537,3.703,4.402,6.659,8.002,8.258
              l4.685,2.08c1.538,0.682,1.538,2.919,0,3.602l-4.836,2.147C27.26,25.126,24.446,27.976,22.882,31.557z"
            />
          </svg>
          <span 
  className="text-gray-600 text-xs sm:text-sm italic cursor-pointer hover:text-indigo-600 transition-colors duration-200"
  onClick={() => alert("✨ Magic is here!")}
>
  Click here to see magic
</span>


        </span>
      </button>
    </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-5 card">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Summary</h2>
          <div className="flex items-center gap-6">
            <PieChart data={chartData} size={180} />
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span>Total Budget</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{Number(totalBudget || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  <span>Expenses</span>
                </div>
                <div className="text-xl font-semibold text-rose-600">{spent.toLocaleString()}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-slate-600">
                  <PiggyBank className="w-4 h-4 text-emerald-600" />
                  <span>Savings</span>
                </div>
                <div className="text-xl font-semibold text-emerald-600">{remaining.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 card">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Set Total Budget</h2>
          <input
            type="number"
            value={totalBudget}
            onChange={(e) => onBudgetChange(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Enter total monthly budget"
            min="0"
          />
        </div>

        {/* Quick Add by AI */}
        <div className="bg-white rounded-xl shadow p-5 md:col-span-2 card">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Add by AI</h2>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={nl}
              onChange={(e) => setNl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onQuickAdd(); } }}
              className="border border-slate-300 rounded-lg px-3 py-2"
              placeholder='e.g., "Bought Samsung watch $250" or "iPhone 15 $999"'
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onQuickAdd}
                disabled={!nl || quickAddLoading}
                className="bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-60"
              >
                {quickAddLoading ? 'Adding…' : 'Add automatically'}
              </button>
              <button
                type="button"
                onClick={onParse}
                disabled={!nl || parsing}
                className="bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
              >
                {parsing ? 'Parsing…' : 'Parse (preview)'}
              </button>
              <button
                type="button"
                onClick={onUseInForm}
                disabled={!parsed}
                className="bg-slate-100 text-slate-800 rounded-lg px-4 py-2 hover:bg-slate-200 disabled:opacity-60"
              >
                Use in form
              </button>
              <button
                type="button"
                onClick={onConfirmParsed}
                disabled={!parsed}
                className="bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-60"
              >
                Confirm expense
              </button>
            </div>
            {quickAddMsg && <div className="text-sm text-emerald-700">{quickAddMsg}</div>}
            {parseError && <div className="text-sm text-red-600">{parseError}</div>}
            {parsed && (
              <div className="text-sm text-slate-700">
                <div>Amount: ${parsed.amount}</div>
                <div>Category: {parsed.category || 'General'}</div>
              </div>
            )}
            <div className="text-xs text-slate-500">Tip: Press Enter to add automatically using AI (Gemini when available).
             </div>
              <p1> “Note: Please enter amounts in Rupees or Dollars for accurate expense tracking.”</p1>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 md:col-span-2 card">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Add Expense</h2>
          <form onSubmit={onAddExpense} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Expense name"
            />
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Amount"
              min="0"
            />
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Category (e.g., Food)"
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Date"
            />
            <button
              type="submit"
              className="bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700"
            >
              Add
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow p-5 md:col-span-2 card">
          <div className="flex items<center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-600" />
              Expenses
            </h2>
            <Link to={`/dashboard/history${form.date ? `?date=${encodeURIComponent(form.date)}` : ''}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-sm">
              View History{form.date ? ` for ${form.date}` : ''}
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={async () => {
                setAi({ loading: true, text: "" });
                try {
                  if (token) {
                    const resp = await fetch(`${API_BASE}/api/budget/insight`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await resp.json();
                    setAi({ loading: false, text: data?.insight || data?.suggestion || '' });
                  } else {
                    const resp = await fetch(`${API_BASE}/api/ai/suggest`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ totalBudget, expenses }),
                    });
                    const data = await resp.json();
                    setAi({ loading: false, text: data?.suggestion || '' });
                  }
                } catch (e) {
                  setAi({ loading: false, text: 'Unable to generate suggestion at this time.' });
                }
              }}
              className="bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700"
            >
              {ai.loading ? 'Generating...' : 'Get AI Suggestions'}
            </button>
            {ai.text && (
              <span className="text-xs text-slate-500">Refreshed from AI</span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm text-slate-600">Filter by category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {filteredExpenses.length === 0 ? (
            <div className="text-slate-500">No expenses yet. Add your first one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm rounded-xl overflow-hidden shadow-sm">
                <thead>
                  <tr className="text-emerald-800 bg-emerald-50">
                    <th className="py-2">Name</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="border-t odd:bg-slate-50/60 hover:bg-slate-100/60 transition-colors">
                      <td className="py-2 text-slate-800">{e.label}</td>
                      <td className="py-2"><span className="badge badge-secondary">{e.category || "Other"}</span></td>
                      <td className="py-2 font-medium">{Number(e.amount).toLocaleString()}</td>
                      <td className="py-2">
                        <button
                          onClick={() => onDelete(e.id)}
                          className="btn btn-destructive btn-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-5 md:col-span-2 card">
          <h2 className="text-xl font-bold text-slate-800 mb-2">AI Suggestion</h2>
          <div className="prose max-w-none">
            <p className="text-slate-600 whitespace-pre-wrap">{ai.text || aiSuggestion}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 md:col-span-2 card">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Category Breakdown</h2>
          {categoryData.length === 0 ? (
            <div className="text-slate-500">No expenses to analyze.</div>
          ) : (
            <PieChart
              data={categoryData.map((c, i) => ({
                label: c.label,
                value: c.value,
              }))}
              size={220}
            />
          )}
        </div>
      </div>
    </div>
  );
}
