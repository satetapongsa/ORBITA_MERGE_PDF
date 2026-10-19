import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config, billingMode } from './config.js';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import toolRoutes from './routes/tools.js';
import billingRoutes, { webhookRouter } from './routes/billing.js';
import assistantRoutes from './routes/assistant.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'script-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'img-src': ["'self'", 'data:', 'blob:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    },
  },
}));

// Stripe needs the raw body, so the webhook is mounted before the JSON parser.
app.use('/api/billing/webhook', webhookRouter);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Serve the built React app in production.
const dist = path.resolve('dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `Each file must be ${config.maxUploadMb} MB or smaller.` });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.expose ? 'Something went wrong. Please try again.' : err.message });
});

// Verify the database is reachable and the schema exists before accepting traffic.
try {
  await pool.query('SELECT 1 FROM users LIMIT 1');
} catch (err) {
  console.error(`Database check failed: ${err.message}\nRun "npm run db:migrate" after setting DATABASE_URL.`);
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`PageSmith API on http://localhost:${config.port} (billing: ${billingMode}, timezone: ${config.timezone})`);
});
