import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Brain, Wallet, Receipt, PiggyBank } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '';

// Local storage helpers to keep parity with Budget page cache
const loadState = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export default function AiInsights() {
  const { currentUser } = useAuth();
  const storageKey = useMemo(() => currentUser ? `fat_budget_${currentUser.id}_v1` : 'fat_budget_guest_v1', [currentUser]);

  const [context, setContext] = useState({ totalBudget: 0, expenses: [] });
  const [qa, setQa] = useState({ question: '', loading: false, answer: '' });

  useEffect(() => {
    const cached = loadState(storageKey);
    if (cached && typeof cached === 'object') {
      setContext({
        totalBudget: Number(cached.totalBudget || 0),
        expenses: Array.isArray(cached.expenses) ? cached.expenses : [],
      });
    }
  }, [storageKey]);

  const ask = async () => {
    if (!qa.question.trim()) return;
    setQa((s) => ({ ...s, loading: true, answer: '' }));
    try {
      const resp = await fetch(`${API_BASE}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qa.question.trim(), ...context }),
      });
      const data = await resp.json();
      setQa((s) => ({ ...s, loading: false, answer: data?.answer || 'No answer returned.' }));
    } catch (e) {
      setQa((s) => ({ ...s, loading: false, answer: 'Unable to get an answer at this time.' }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-emerald-700 flex items-center gap-2">
            <Brain className="w-7 h-7 text-emerald-700" />
            AI Insights
          </h1>
          <div className="text-sm text-slate-500">
            Context: budget {Number(context.totalBudget || 0).toLocaleString()} · expenses {context.expenses.length}
          </div>
        </div>

        {/* Context cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Total Budget</div>
                <div className="text-xl font-semibold text-slate-800">{Number(context.totalBudget || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Expenses</div>
                <div className="text-xl font-semibold text-rose-600">{context.expenses.length}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#dcfce7', color: '#047857' }}>
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-slate-500">Avg. per Expense</div>
                <div className="text-xl font-semibold text-emerald-600">
                  {context.expenses.length ? Math.round(context.expenses.reduce((s, e) => s + Number(e.amount || 0), 0) / context.expenses.length).toLocaleString() : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ask / Answer card */}
        <div className="card space-y-4 animate-slide-up">
          <div>
            <label className="block text-slate-700 font-medium mb-2">Ask anything about your budget</label>
            <textarea
              rows={4}
              value={qa.question}
              onChange={(e) => setQa((s) => ({ ...s, question: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., What are three specific actions to cut my top spending category by 15%?"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={ask}
              disabled={!qa.question.trim() || qa.loading}
              className={`bg-emerald-600 text-white rounded-lg px-4 py-2 hover:bg-emerald-700 ${qa.loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {qa.loading ? 'Asking Gemini...' : 'Ask Gemini'}
            </button>
            <span className="text-slate-500 text-sm">Powered by Gemini</span>
          </div>

          {qa.answer && (
            <div className="prose max-w-none border border-slate-200 rounded-lg p-4 bg-slate-50">
              <p className="text-slate-700 whitespace-pre-wrap">{qa.answer}</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-slate-500">
          Tip: The model receives your total budget and summarized expenses from your latest session to tailor answers.
        </div>
      </div>
    </div>
  );
}
