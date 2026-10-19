import path from 'node:path';

// Any Vercel deployment (production or preview) shares the real database, so treat it as production:
// no test billing and no default session secret.
const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.');
  process.exit(1);
}
if (isProd && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET must be set in production.');
  process.exit(1);
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, ''),
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
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
    dailyLimit: Number(process.env.ASSISTANT_DAILY_LIMIT || 100),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceId: process.env.STRIPE_PRICE_ID || '',
  },
};

// Without Stripe keys the app runs in "mock billing" mode so it can be tried locally.
export const billingMode = config.stripe.secretKey ? 'stripe' : 'mock';
if (billingMode === 'mock' && isProd) {
  console.error('STRIPE_SECRET_KEY must be set in production (mock billing is dev-only).');
  process.exit(1);
}
