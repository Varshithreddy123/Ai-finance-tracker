// Server.js - Express API with Neon (Postgres) via pg, Drizzle removed for reliability
// Compatible with Neon connection string in DATABASE_URL

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();
// Fallback to .env.local (commonly used by CRA) if DATABASE_URL not set
if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  try { dotenv.config({ path: '.env.local' }); } catch {}
}
// Ensure fetch is available in Node environments
const fetch = (typeof global.fetch === 'function') ? global.fetch : require('node-fetch');

// AI providers (OpenAI or Gemini) optional setup
let AI = { openai: null, gemini: null };
try {
  if (process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai');
    AI.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (e) {
  console.warn('OpenAI SDK not installed or failed to init:', e.message);
}
try {
  const GEMINI_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (GEMINI_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    AI.gemini = new GoogleGenerativeAI(GEMINI_KEY);
  }
} catch (e) {
  console.warn('Gemini SDK not installed or failed to init:', e.message);
}

const app = express();
const PORT = process.env.API_PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const DATABASE_URL = process.env.DATABASE_URL || '';

app.use(cors());
app.use(bodyParser.json());

// Postgres pool (Neon-compatible)
let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

// --- Helpers ---
function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// AI suggestion helper using Gemini (preferred) or OpenAI with heuristic fallback
async function getAiSuggestion(totalBudget, expenses) {
  const total = Number(totalBudget) || 0;
  const spent = (Array.isArray(expenses) ? expenses : []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCat = (Array.isArray(expenses) ? expenses : []).reduce((acc, e) => {
    const c = e.category || 'Other';
    acc[c] = (acc[c] || 0) + Number(e.amount || 0);
    return acc;
  }, {});
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const heuristic = (() => {
    if (!total) return 'Set a valid total budget to get insights.';
    const pct = spent / total;
    if (pct < 0.5) return "Good job! You're under 50% of your budget. Consider saving or investing the surplus.";
    if (pct < 0.85) return "You're within a safe range. Monitor recurring categories like Food or Transport to optimize further.";
    return `Warning: Spending is high (${Math.round(pct * 100)}% of budget). Biggest category: ${top ? top[0] : 'N/A'}. Try setting a weekly cap or switching to lower-cost alternatives.`;
  })();

  const prompt = [
    'You are a personal finance assistant.',
    'Given the monthly total budget and the list of expenses (label, category, amount), provide 3-5 concise, actionable suggestions to optimize spending.',
    'Be practical, avoid generic fluff, and use the top spending categories if useful.',
    '',
    `Total budget: ${total}`,
    `Total spent: ${spent}`,
    'Category totals:',
    ...Object.entries(byCat).map(([c, v]) => `- ${c}: ${v}`),
  ].join('\n');

  // Try Gemini first (preferred)
  if (AI.gemini) {
    try {
      const model = AI.gemini.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
      const resp = await model.generateContent(prompt);
      const text = resp?.response?.text?.() || resp?.response?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n');
      if (text) return text.trim();
    } catch (e) {
      console.warn('Gemini suggestion error:', e.message);
    }
  }

  // Fallback to OpenAI if configured
  if (AI.openai) {
    try {
      const resp = await AI.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise, practical finance advisor.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
      });
      const text = resp?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch (e) {
      console.warn('OpenAI suggestion error:', e.message);
    }
  }

  // Fallback
  return heuristic;
}

// Basic bootstrap to ensure minimal schema exists when DB is available
async function ensureSchema() {
  if (!pool) return; // Skip if no DB configured
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_budgets (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      total_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_expenses (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      label VARCHAR(200) NOT NULL,
      category VARCHAR(100),
      amount NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      phone VARCHAR(50),
      company VARCHAR(150),
      bio TEXT,
      profile_photo TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_transactions (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
      label VARCHAR(200) NOT NULL,
      category VARCHAR(100),
      amount NUMERIC(12,2) NOT NULL,
      occurred_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

ensureSchema().catch((e) => console.error('Schema init error:', e));

// In-memory fallback when DATABASE_URL not set
const memory = {
  users: [],
  budgets: new Map(), // userId -> totalBudget
  expenses: new Map(), // userId -> Array<{id,label,category,amount}>
  transactions: new Map(), // userId -> Array<{id,label,category,amount,type,occurred_at}>
  userProfiles: new Map(), // userId -> { phone, company, bio, profile_photo }
};

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    if (pool) {
      const { rows: exists } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
      if (exists.length) return res.status(400).json({ message: 'User already exists' });
      const hashed = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (first_name, last_name, email, password) VALUES ($1,$2,$3,$4)',
        [firstName, lastName, email, hashed]
      );
      return res.status(201).json({ message: 'User registered successfully' });
    } else {
      const exists = memory.users.find((u) => u.email === email);
      if (exists) return res.status(400).json({ message: 'User already exists' });
      const hashed = await bcrypt.hash(password, 10);
      const newUser = { id: memory.users.length + 1, firstName, lastName, email, password: hashed };
      memory.users.push(newUser);
      return res.status(201).json({ message: 'User registered successfully' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = null;
    if (pool) {
      const { rows } = await pool.query('SELECT id, first_name, last_name, email, password FROM users WHERE email=$1', [email]);
      if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
      user = rows[0];
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
      const token = generateToken({ id: user.id, email: user.email });
      return res.json({ token, user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email } });
    } else {
      const found = memory.users.find((u) => u.email === email);
      if (!found) return res.status(401).json({ message: 'Invalid credentials' });
      const ok = await bcrypt.compare(password, found.password);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
      const token = generateToken(found);
      return res.json({ token, user: { id: found.id, firstName: found.firstName, lastName: found.lastName, email: found.email } });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/auth/validate', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    res.json({ user });
  });
});

// Google OAuth login endpoint: exchanges Google access_token for profile and issues app JWT
app.post('/api/auth/google-login', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ message: 'Missing Google access token' });
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(401).json({ message: 'Invalid Google token' });
    const profile = await r.json();
    const email = profile?.email;
    if (!email) return res.status(400).json({ message: 'Unable to retrieve Google user email' });

    if (pool) {
      let q = await pool.query('SELECT id, first_name, last_name, email FROM users WHERE email=$1', [email]);
      if (!q.rows.length) {
        const hashed = await bcrypt.hash(jwt.sign({ email, t: Date.now() }, JWT_SECRET), 10);
        q = await pool.query(
          'INSERT INTO users (first_name, last_name, email, password) VALUES ($1,$2,$3,$4) RETURNING id, first_name, last_name, email',
          [profile?.given_name || 'Google', profile?.family_name || 'User', email, hashed]
        );
      }
      const u = q.rows[0];
      const appToken = generateToken({ id: u.id, email: u.email });
      return res.json({ token: appToken, user: { id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email } });
    } else {
      let u = memory.users.find((x) => x.email === email);
      if (!u) {
        const hashed = await bcrypt.hash(jwt.sign({ email, t: Date.now() }, JWT_SECRET), 10);
        u = { id: memory.users.length + 1, firstName: profile?.given_name || 'Google', lastName: profile?.family_name || 'User', email, password: hashed };
        memory.users.push(u);
      }
      const appToken = generateToken(u);
      return res.json({ token: appToken, user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email } });
    }
  } catch (e) {
    console.error('Google login error:', e);
    return res.status(500).json({ message: 'Failed to sign in with Google' });
  }
});

// --- Additional Auth Routes (non-/api) ---
app.post('/auth/google', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ message: 'Missing Google access token' });
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(401).json({ message: 'Invalid Google token' });
    const profile = await r.json();
    const email = profile?.email;
    if (!email) return res.status(400).json({ message: 'Unable to retrieve Google user email' });

    if (pool) {
      let q = await pool.query('SELECT id, first_name, last_name, email FROM users WHERE email=$1', [email]);
      if (!q.rows.length) {
        const hashed = await bcrypt.hash(jwt.sign({ email, t: Date.now() }, JWT_SECRET), 10);
        q = await pool.query(
          'INSERT INTO users (first_name, last_name, email, password) VALUES ($1,$2,$3,$4) RETURNING id, first_name, last_name, email',
          [profile?.given_name || 'Google', profile?.family_name || 'User', email, hashed]
        );
      }
      const u = q.rows[0];
      const appToken = generateToken({ id: u.id, email: u.email });
      return res.json({ token: appToken, user: { id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email } });
    } else {
      let u = memory.users.find((x) => x.email === email);
      if (!u) {
        const hashed = await bcrypt.hash(jwt.sign({ email, t: Date.now() }, JWT_SECRET), 10);
        u = { id: memory.users.length + 1, firstName: profile?.given_name || 'Google', lastName: profile?.family_name || 'User', email, password: hashed };
        memory.users.push(u);
      }
      const appToken = generateToken(u);
      return res.json({ token: appToken, user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email } });
    }
  } catch (e) {
    console.error('Google login error:', e);
    return res.status(500).json({ message: 'Failed to sign in with Google' });
  }
});

app.post('/auth/refresh', authMiddleware, (req, res) => {
  const user = req.user;
  const newToken = generateToken({ id: user.id, email: user.email });
  return res.json({ token: newToken });
});

app.post('/auth/logout', authMiddleware, (req, res) => {
  // Stateless JWT: nothing to revoke server-side unless using a blocklist.
  return res.json({ message: 'Logged out' });
});

app.get('/auth/profile', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    if (pool) {
      const { rows: uRows } = await pool.query('SELECT id, first_name, last_name, email FROM users WHERE id=$1', [userId]);
      if (!uRows.length) return res.status(404).json({ message: 'User not found' });
      const user = uRows[0];
      const { rows: pRows } = await pool.query('SELECT phone, company, bio, profile_photo FROM user_profiles WHERE user_id=$1', [userId]);
      const profile = pRows[0] || {};
      return res.json({ id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, ...profile });
    } else {
      const u = memory.users.find((x) => x.id === userId);
      if (!u) return res.status(404).json({ message: 'User not found' });
      const p = memory.userProfiles.get(userId) || {};
      return res.json({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, ...p });
    }
  } catch (e) {
    console.error('Profile fetch error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Profile update to support frontend PUT /api/profile
app.put('/api/profile', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName, phone, company, bio, profilePhoto } = req.body || {};
  try {
    if (pool) {
      if (firstName || lastName) {
        await pool.query(
          'UPDATE users SET first_name=COALESCE($1, first_name), last_name=COALESCE($2, last_name) WHERE id=$3',
          [firstName || null, lastName || null, userId]
        );
      }
      await pool.query(
        'INSERT INTO user_profiles (user_id, phone, company, bio, profile_photo, updated_at) VALUES ($1,$2,$3,$4,$5,NOW())\n         ON CONFLICT (user_id) DO UPDATE SET phone=EXCLUDED.phone, company=EXCLUDED.company, bio=EXCLUDED.bio, profile_photo=EXCLUDED.profile_photo, updated_at=NOW()',
        [userId, phone || null, company || null, bio || null, profilePhoto || null]
      );
      const { rows: uRows } = await pool.query('SELECT id, first_name, last_name, email FROM users WHERE id=$1', [userId]);
      const { rows: pRows } = await pool.query('SELECT phone, company, bio, profile_photo FROM user_profiles WHERE user_id=$1', [userId]);
      const u = uRows[0];
      const p = pRows[0] || {};
      return res.json({ user: { id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, ...p } });
    } else {
      const uIdx = memory.users.findIndex((x) => x.id === userId);
      if (uIdx >= 0) {
        if (firstName) memory.users[uIdx].firstName = firstName;
        if (lastName) memory.users[uIdx].lastName = lastName;
      }
      const prev = memory.userProfiles.get(userId) || {};
      const next = { ...prev, phone, company, bio, profile_photo: profilePhoto };
      memory.userProfiles.set(userId, next);
      const u = memory.users[uIdx];
      return res.json({ user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, ...next } });
    }
  } catch (e) {
    console.error('Profile update error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// --- Transactions & Analytics ---
function parseTransactionText(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  // Basic patterns: "spent 20 on food", "income 1000 salary", "$15 coffee", "+200 freelance"
  const amountMatch = lower.match(/([+-]?\$?\d+(?:\.\d{1,2})?)/);
  let amount = amountMatch ? Number(amountMatch[1].replace('
app.get('/api/budget', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    if (pool) {
      const [{ rows: bRows }, { rows: eRows }] = await Promise.all([
        pool.query('SELECT total_budget FROM user_budgets WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]),
        pool.query('SELECT id, label, category, amount, created_at FROM user_expenses WHERE user_id=$1 ORDER BY created_at DESC', [userId]),
      ]);
      const totalBudget = bRows[0]?.total_budget || 0;
      return res.json({ totalBudget: Number(totalBudget), expenses: eRows.map((r) => ({ ...r, amount: Number(r.amount) })) });
    } else {
      const totalBudget = memory.budgets.get(userId) || 0;
      const expenses = memory.expenses.get(userId) || [];
      return res.json({ totalBudget, expenses });
    }
  } catch (e) {
    console.error('Get budget error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/budget', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { totalBudget } = req.body;
  const value = Number(totalBudget) || 0;
  try {
    if (pool) {
      await pool.query('INSERT INTO user_budgets (user_id, total_budget) VALUES ($1,$2)', [userId, value]);
    } else {
      memory.budgets.set(userId, value);
    }
    return res.json({ message: 'Budget updated', totalBudget: value });
  } catch (e) {
    console.error('Set budget error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/expenses', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { label, category = 'General', amount, date } = req.body;
  const value = Number(amount);
  if (!label || !value || value <= 0) return res.status(400).json({ message: 'Invalid expense payload' });

  // Optional client-provided date for created_at
  let createdAt = null;
  if (date) {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) createdAt = d.toISOString();
    } catch {}
  }

  try {
    if (pool) {
      let row;
      if (createdAt) {
        const { rows } = await pool.query(
          'INSERT INTO user_expenses (user_id, label, category, amount, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id, label, category, amount, created_at',
          [userId, label, category, value, createdAt]
        );
        row = rows[0];
      } else {
        const { rows } = await pool.query(
          'INSERT INTO user_expenses (user_id, label, category, amount) VALUES ($1,$2,$3,$4) RETURNING id, label, category, amount, created_at',
          [userId, label, category, value]
        );
        row = rows[0];
      }
      return res.status(201).json({ id: row.id, label: row.label, category: row.category, amount: Number(row.amount), created_at: row.created_at });
    } else {
      const list = memory.expenses.get(userId) || [];
      const item = { id: Date.now(), label, category, amount: value, created_at: createdAt || new Date().toISOString() };
      list.unshift(item);
      memory.expenses.set(userId, list);
      return res.status(201).json(item);
    }
  } catch (e) {
    console.error('Add expense error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/expenses/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  try {
    if (pool) {
      await pool.query('DELETE FROM user_expenses WHERE user_id=$1 AND id=$2', [userId, id]);
      return res.json({ message: 'Deleted' });
    } else {
      const list = memory.expenses.get(userId) || [];
      const next = list.filter((e) => e.id !== id);
      memory.expenses.set(userId, next);
      return res.json({ message: 'Deleted' });
    }
  } catch (e) {
    console.error('Delete expense error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Public AI suggestion endpoint (no auth) - expects { totalBudget, expenses }
app.post('/api/ai/suggest', async (req, res) => {
  try {
    const { totalBudget, expenses } = req.body || {};
    const suggestion = await getAiSuggestion(totalBudget, expenses || []);
    return res.json({ suggestion });
  } catch (e) {
    console.error('AI suggest error:', e);
    return res.status(500).json({ suggestion: 'Unable to generate AI suggestion at this time.' });
  }
});

// AI-like suggestion endpoint (authenticated)
app.get('/api/budget/insight', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    let totalBudget = 0;
    let expenses = [];
    if (pool) {
      const [{ rows: bRows }, { rows: eRows }] = await Promise.all([
        pool.query('SELECT total_budget FROM user_budgets WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]),
        pool.query('SELECT category, amount FROM user_expenses WHERE user_id=$1', [userId])
      ]);
      totalBudget = Number(bRows[0]?.total_budget || 0);
      expenses = eRows.map((r) => ({ category: r.category, amount: Number(r.amount) }));
    } else {
      totalBudget = memory.budgets.get(userId) || 0;
      expenses = (memory.expenses.get(userId) || []).map((e) => ({ category: e.category, amount: e.amount }));
    }

    const spent = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Use AI suggestion helper (Gemini/OpenAI/heuristic)
    const insight = await getAiSuggestion(totalBudget, expenses);

    return res.json({ totalBudget, spent, insight });
  } catch (e) {
    console.error('Insight error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  if (!pool) {
    console.log('No DATABASE_URL provided. Running with in-memory data.');
  } else {
    console.log('Connected to Postgres via pg.');
  }
});
, '')) : null;
  let type = null;
  if (amount !== null) {
    if (amount < 0 || /spent|paid|buy|bought|expense|minus|withdraw/.test(lower)) type = 'expense';
    if (amount > 0 && (/income|salary|earned|deposit|plus|credit|received/.test(lower) || /^[+]/.test(amountMatch[1]))) type = 'income';
  }
  if (amount !== null) amount = Math.abs(amount);
  let category = 'General';
  if (/food|grocery|lunch|dinner|restaurant|coffee/.test(lower)) category = 'Food';
  else if (/transport|uber|bus|train|fuel|gas|petrol|taxi/.test(lower)) category = 'Transport';
  else if (/rent|mortgage|utilities|electric|water|internet/.test(lower)) category = 'Housing';
  else if (/salary|paycheck|bonus|freelance|client|invoice/.test(lower)) category = 'Income';
  else if (/shopping|clothes|amazon|store/.test(lower)) category = 'Shopping';
  const label = text.trim();
  const occurred_at = new Date().toISOString();
  if (amount == null) return null;
  if (!type) type = 'expense';
  return { label, category, amount, type, occurred_at };
}

// Parse natural language into a proposed transaction (no DB write)
app.post('/api/transactions/parse', authMiddleware, async (req, res) => {
  const { text } = req.body || {};
  const parsed = parseTransactionText(text || '');
  if (!parsed) return res.status(400).json({ message: 'Unable to parse input' });
  return res.json(parsed);
});

// Create transaction
app.post('/api/transactions', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { label, category = 'General', amount, type = 'expense', date } = req.body || {};
  const value = Number(amount);
  if (!label || !value || value <= 0) return res.status(400).json({ message: 'Invalid transaction payload' });
  if (!['income','expense'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
  let occurredAt = null;
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) occurredAt = d.toISOString();
  }
  try {
    if (pool) {
      const { rows } = await pool.query(
        'INSERT INTO user_transactions (user_id, type, label, category, amount, occurred_at) VALUES ($1,$2,$3,$4,$5,COALESCE($6,NOW())) RETURNING id, type, label, category, amount, occurred_at',
        [userId, type, label, category, value, occurredAt]
      );
      const r = rows[0];
      return res.status(201).json({ id: r.id, type: r.type, label: r.label, category: r.category, amount: Number(r.amount), occurred_at: r.occurred_at });
    } else {
      const list = memory.transactions.get(userId) || [];
      const item = { id: Date.now(), type, label, category, amount: value, occurred_at: occurredAt || new Date().toISOString() };
      list.unshift(item);
      memory.transactions.set(userId, list);
      return res.status(201).json(item);
    }
  } catch (e) {
    console.error('Create transaction error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get transactions with filters
app.get('/api/transactions', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { type, category, from, to, q } = req.query || {};
  try {
    if (pool) {
      const cond = ['user_id = $1'];
      const params = [userId];
      let idx = 2;
      if (type && ['income','expense'].includes(type)) { cond.push(`type = ${idx++}`); params.push(type); }
      if (category) { cond.push(`category ILIKE ${idx++}`); params.push(category); }
      if (from) { cond.push(`occurred_at >= ${idx++}`); params.push(new Date(from)); }
      if (to) { cond.push(`occurred_at <= ${idx++}`); params.push(new Date(to)); }
      if (q) { cond.push(`(label ILIKE ${idx} OR category ILIKE ${idx})`); params.push(`%${q}%`); idx++; }
      const sql = `SELECT id, type, label, category, amount, occurred_at FROM user_transactions WHERE ${cond.join(' AND ')} ORDER BY occurred_at DESC`;
      const { rows } = await pool.query(sql, params);
      return res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
    } else {
      let list = memory.transactions.get(userId) || [];
      if (type) list = list.filter(x => x.type === type);
      if (category) list = list.filter(x => (x.category || '').toLowerCase() === String(category).toLowerCase());
      if (from) { const f = new Date(from).getTime(); list = list.filter(x => new Date(x.occurred_at).getTime() >= f); }
      if (to) { const t = new Date(to).getTime(); list = list.filter(x => new Date(x.occurred_at).getTime() <= t); }
      if (q) { const s = String(q).toLowerCase(); list = list.filter(x => (x.label+ ' ' + (x.category||'')).toLowerCase().includes(s)); }
      return res.json(list);
    }
  } catch (e) {
    console.error('Get transactions error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update transaction
app.put('/api/transactions/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);
  const { label, category, amount, type, date } = req.body || {};
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  try {
    if (pool) {
      const sets = [];
      const params = [];
      let idx = 1;
      if (label !== undefined) { sets.push(`label = ${idx++}`); params.push(label); }
      if (category !== undefined) { sets.push(`category = ${idx++}`); params.push(category); }
      if (amount !== undefined) { sets.push(`amount = ${idx++}`); params.push(Number(amount)); }
      if (type !== undefined) { if (!['income','expense'].includes(type)) return res.status(400).json({ message: 'Invalid type' }); sets.push(`type = ${idx++}`); params.push(type); }
      if (date !== undefined) { const d = new Date(date); if (!isNaN(d.getTime())) { sets.push(`occurred_at = ${idx++}`); params.push(d); } }
      if (!sets.length) return res.status(400).json({ message: 'No valid fields to update' });
      params.push(userId); params.push(id);
      const sql = `UPDATE user_transactions SET ${sets.join(', ')} WHERE user_id = ${idx++} AND id = ${idx} RETURNING id, type, label, category, amount, occurred_at`;
      const { rows } = await pool.query(sql, params);
      if (!rows.length) return res.status(404).json({ message: 'Not found' });
      const r = rows[0];
      return res.json({ id: r.id, type: r.type, label: r.label, category: r.category, amount: Number(r.amount), occurred_at: r.occurred_at });
    } else {
      const list = memory.transactions.get(userId) || [];
      const i = list.findIndex(x => x.id === id);
      if (i < 0) return res.status(404).json({ message: 'Not found' });
      const prev = list[i];
      const next = {
        ...prev,
        label: label !== undefined ? label : prev.label,
        category: category !== undefined ? category : prev.category,
        amount: amount !== undefined ? Number(amount) : prev.amount,
        type: type !== undefined ? type : prev.type,
        occurred_at: date !== undefined && !isNaN(new Date(date).getTime()) ? new Date(date).toISOString() : prev.occurred_at,
      };
      list[i] = next;
      memory.transactions.set(userId, list);
      return res.json(next);
    }
  } catch (e) {
    console.error('Update transaction error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  try {
    if (pool) {
      await pool.query('DELETE FROM user_transactions WHERE user_id=$1 AND id=$2', [userId, id]);
      return res.json({ message: 'Deleted' });
    } else {
      const list = memory.transactions.get(userId) || [];
      const next = list.filter((e) => e.id !== id);
      memory.transactions.set(userId, next);
      return res.json({ message: 'Deleted' });
    }
  } catch (e) {
    console.error('Delete transaction error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Analytics endpoints
app.get('/api/analytics/summary', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    if (pool) {
      const { rows } = await pool.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
           COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expenses
         FROM user_transactions WHERE user_id=$1`,
        [userId]
      );
      const r = rows[0] || { income: 0, expenses: 0 };
      const income = Number(r.income || 0);
      const expenses = Number(r.expenses || 0);
      return res.json({ income, expenses, savings: income - expenses });
    } else {
      const list = memory.transactions.get(userId) || [];
      const income = list.filter(x => x.type === 'income').reduce((s, x) => s + (x.amount || 0), 0);
      const expenses = list.filter(x => x.type === 'expense').reduce((s, x) => s + (x.amount || 0), 0);
      return res.json({ income, expenses, savings: income - expenses });
    }
  } catch (e) {
    console.error('Summary error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/analytics/categories', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    if (pool) {
      const { rows } = await pool.query(
        `SELECT COALESCE(category,'Uncategorized') AS category, SUM(amount) AS total
         FROM user_transactions WHERE user_id=$1 AND type='expense'
         GROUP BY 1 ORDER BY total DESC`,
        [userId]
      );
      return res.json(rows.map(r => ({ category: r.category, total: Number(r.total) })));
    } else {
      const list = (memory.transactions.get(userId) || []).filter(x => x.type === 'expense');
      const totals = list.reduce((acc, x) => { const c = x.category || 'Uncategorized'; acc[c] = (acc[c] || 0) + (x.amount || 0); return acc; }, {});
      return res.json(Object.entries(totals).map(([category, total]) => ({ category, total })));
    }
  } catch (e) {
    console.error('Categories error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/analytics/trends', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    if (pool) {
      const { rows } = await pool.query(
        `SELECT to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS month,
                SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses
         FROM user_transactions WHERE user_id=$1
         GROUP BY 1 ORDER BY 1`,
        [userId]
      );
      return res.json(rows.map(r => ({ month: r.month, income: Number(r.income || 0), expenses: Number(r.expenses || 0) })));
    } else {
      const list = memory.transactions.get(userId) || [];
      const byMonth = list.reduce((acc, x) => {
        const m = new Date(x.occurred_at).toISOString().slice(0,7);
        if (!acc[m]) acc[m] = { income: 0, expenses: 0 };
        acc[m][x.type === 'income' ? 'income' : 'expenses'] += x.amount || 0;
        return acc;
      }, {});
      return res.json(Object.entries(byMonth).sort((a,b)=>a[0].localeCompare(b[0])).map(([month, v]) => ({ month, income: v.income, expenses: v.expenses })));
    }
  } catch (e) {
    console.error('Trends error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// --- Budget/Expense Routes ---
app.get('/api/budget', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    if (pool) {
      const [{ rows: bRows }, { rows: eRows }] = await Promise.all([
        pool.query('SELECT total_budget FROM user_budgets WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]),
        pool.query('SELECT id, label, category, amount, created_at FROM user_expenses WHERE user_id=$1 ORDER BY created_at DESC', [userId]),
      ]);
      const totalBudget = bRows[0]?.total_budget || 0;
      return res.json({ totalBudget: Number(totalBudget), expenses: eRows.map((r) => ({ ...r, amount: Number(r.amount) })) });
    } else {
      const totalBudget = memory.budgets.get(userId) || 0;
      const expenses = memory.expenses.get(userId) || [];
      return res.json({ totalBudget, expenses });
    }
  } catch (e) {
    console.error('Get budget error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/budget', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { totalBudget } = req.body;
  const value = Number(totalBudget) || 0;
  try {
    if (pool) {
      await pool.query('INSERT INTO user_budgets (user_id, total_budget) VALUES ($1,$2)', [userId, value]);
    } else {
      memory.budgets.set(userId, value);
    }
    return res.json({ message: 'Budget updated', totalBudget: value });
  } catch (e) {
    console.error('Set budget error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/expenses', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { label, category = 'General', amount, date } = req.body;
  const value = Number(amount);
  if (!label || !value || value <= 0) return res.status(400).json({ message: 'Invalid expense payload' });

  // Optional client-provided date for created_at
  let createdAt = null;
  if (date) {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) createdAt = d.toISOString();
    } catch {}
  }

  try {
    if (pool) {
      let row;
      if (createdAt) {
        const { rows } = await pool.query(
          'INSERT INTO user_expenses (user_id, label, category, amount, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING id, label, category, amount, created_at',
          [userId, label, category, value, createdAt]
        );
        row = rows[0];
      } else {
        const { rows } = await pool.query(
          'INSERT INTO user_expenses (user_id, label, category, amount) VALUES ($1,$2,$3,$4) RETURNING id, label, category, amount, created_at',
          [userId, label, category, value]
        );
        row = rows[0];
      }
      return res.status(201).json({ id: row.id, label: row.label, category: row.category, amount: Number(row.amount), created_at: row.created_at });
    } else {
      const list = memory.expenses.get(userId) || [];
      const item = { id: Date.now(), label, category, amount: value, created_at: createdAt || new Date().toISOString() };
      list.unshift(item);
      memory.expenses.set(userId, list);
      return res.status(201).json(item);
    }
  } catch (e) {
    console.error('Add expense error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/expenses/:id', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  try {
    if (pool) {
      await pool.query('DELETE FROM user_expenses WHERE user_id=$1 AND id=$2', [userId, id]);
      return res.json({ message: 'Deleted' });
    } else {
      const list = memory.expenses.get(userId) || [];
      const next = list.filter((e) => e.id !== id);
      memory.expenses.set(userId, next);
      return res.json({ message: 'Deleted' });
    }
  } catch (e) {
    console.error('Delete expense error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Public AI suggestion endpoint (no auth) - expects { totalBudget, expenses }
app.post('/api/ai/suggest', async (req, res) => {
  try {
    const { totalBudget, expenses } = req.body || {};
    const suggestion = await getAiSuggestion(totalBudget, expenses || []);
    return res.json({ suggestion });
  } catch (e) {
    console.error('AI suggest error:', e);
    return res.status(500).json({ suggestion: 'Unable to generate AI suggestion at this time.' });
  }
});

// AI-like suggestion endpoint (authenticated)
app.get('/api/budget/insight', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    let totalBudget = 0;
    let expenses = [];
    if (pool) {
      const [{ rows: bRows }, { rows: eRows }] = await Promise.all([
        pool.query('SELECT total_budget FROM user_budgets WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]),
        pool.query('SELECT category, amount FROM user_expenses WHERE user_id=$1', [userId])
      ]);
      totalBudget = Number(bRows[0]?.total_budget || 0);
      expenses = eRows.map((r) => ({ category: r.category, amount: Number(r.amount) }));
    } else {
      totalBudget = memory.budgets.get(userId) || 0;
      expenses = (memory.expenses.get(userId) || []).map((e) => ({ category: e.category, amount: e.amount }));
    }

    const spent = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Use AI suggestion helper (Gemini/OpenAI/heuristic)
    const insight = await getAiSuggestion(totalBudget, expenses);

    return res.json({ totalBudget, spent, insight });
  } catch (e) {
    console.error('Insight error:', e);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  if (!pool) {
    console.log('No DATABASE_URL provided. Running with in-memory data.');
  } else {
    console.log('Connected to Postgres via pg.');
  }
});
