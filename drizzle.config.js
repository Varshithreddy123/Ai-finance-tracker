const { defineConfig } = require('drizzle-kit');
const path = require('path');

// Load env from .env and .env.local if present
try { require('dotenv').config({ path: path.resolve(__dirname, '.env') }); } catch (_) {}
try { require('dotenv').config({ path: path.resolve(__dirname, '.env.local') }); } catch (_) {}

if (!process.env.DATABASE_URL) {
  console.warn('[drizzle.config] DATABASE_URL is not set. Please create .env or .env.local with DATABASE_URL=...');
}

module.exports = defineConfig({
  out: './drizzle',
  dialect: 'postgresql',
  schema: './utils/schema.js',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
});
