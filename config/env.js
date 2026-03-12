// config/env.js
import 'dotenv/config';

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'GROQ_API_KEY',
];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`❌  Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

export const env = {
  NODE_ENV:    process.env.NODE_ENV    || 'development',
  PORT:        parseInt(process.env.PORT) || 5001,

  SUPABASE_URL:         process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,

  GROQ_API_KEY: process.env.GROQ_API_KEY,

  RESEND_API_KEY:       process.env.RESEND_API_KEY || '',
  EMAIL_FROM:           process.env.EMAIL_FROM || 'hello@pockethost.in',

  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,https://pockethost.in,https://www.pockethost.in')
    .split(',').map(s => s.trim()),
  DOMAIN: process.env.DOMAIN || 'pockethost.in',

  ADMIN_SECRET: process.env.ADMIN_SECRET || 'change-me-in-production',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_MAX:       parseInt(process.env.RATE_LIMIT_MAX)       || 100,
  AUTH_RATE_MAX:        parseInt(process.env.AUTH_RATE_MAX)        || 20,
};
