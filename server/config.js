import path from 'node:path';

// Any Vercel deployment (production or preview) shares the real database, so treat it as production:
// no test billing and no default session secret.
const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

/** A setup problem that is safe to show to the site owner (names settings, never their values). */
export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
    this.isConfigError = true;
  }
}

/** Accept connection strings pasted with quotes or as a `psql '…'` command. */
function cleanDatabaseUrl(raw) {
  const value = String(raw || '').trim().replace(/^psql\s+/, '').replace(/^['"]|['"]$/g, '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error();
  } catch {
    throw new ConfigError('DATABASE_URL is not a valid postgresql:// connection string. Copy it again from the Neon console.');
  }
  return value;
}

const env = (name) => (process.env[name] || '').trim();

const missing = [];
const databaseUrl = cleanDatabaseUrl(process.env.DATABASE_URL);
if (!databaseUrl) missing.push('DATABASE_URL');
if (!env('JWT_SECRET')) missing.push('JWT_SECRET');

if (missing.length) {
  throw new ConfigError(`Missing environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Add ${missing.length > 1 ? 'them' : 'it'} in the hosting settings and redeploy.`);
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 3001),
  databaseUrl,
  jwtSecret: env('JWT_SECRET') || 'dev-only-secret-change-me',
  appUrl: (env('APP_URL') || 'http://localhost:5173').replace(/\/+$/, ''),
  storageDir: path.resolve(process.env.STORAGE_DIR || './storage'),
  timezone: process.env.APP_TIMEZONE || 'Asia/Bangkok',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 50),
  plans: {
    free: { id: 'free', name: 'Free', priceThb: 0, dailyLimit: 5 },
    pro: { id: 'pro', name: 'Pro', priceThb: 20, dailyLimit: 20 },
  },
  assistant: {
    // Public branding only — the underlying provider/model is never sent to the browser.
    name: process.env.ASSISTANT_NAME || 'PageSmith 5.5 Pro',
    apiKey: env('DEEPSEEK_API_KEY'),
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
    dailyLimit: Number(process.env.ASSISTANT_DAILY_LIMIT || 100),
  },
  stripe: {
    secretKey: env('STRIPE_SECRET_KEY'),
    webhookSecret: env('STRIPE_WEBHOOK_SECRET'),
    priceId: env('STRIPE_PRICE_ID'),
  },
};

// Without Stripe keys the app runs in "mock billing" mode so it can be tried locally (never in production).
export const billingMode = config.stripe.secretKey ? 'stripe' : 'mock';
