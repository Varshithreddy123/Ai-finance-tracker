// Database configuration for Neon using node-postgres and Drizzle
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const path = require('path');

// Load env
try { require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); } catch (_) {}
try { require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') }); } catch (_) {}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('[dbConfig] DATABASE_URL is not set. Create .env or .env.local with DATABASE_URL for Neon.');
}

// Neon requires SSL. node-postgres uses ssl: { rejectUnauthorized: false } for typical managed DBs.
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool);

// Export schema for convenience (CommonJS requires)
const { users, wallets, transactions, categories } = require('./schema');

module.exports = {
  db,
  pool,
  users,
  wallets,
  transactions,
  categories,
};
