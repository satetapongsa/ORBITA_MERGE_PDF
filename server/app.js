import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import toolRoutes from './routes/tools.js';
import billingRoutes, { webhookRouter } from './routes/billing.js';
import assistantRoutes from './routes/assistant.js';

// The Express app, shared by the standalone server (server/index.js) and the
// Vercel function (api/index.js).
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'script-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'img-src': ["'self'", 'data:', 'blob:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      // Direct uploads go to Vercel Blob; large previews are fetched from signed Blob URLs.
      'connect-src': ["'self'", 'https://vercel.com', 'https://*.blob.vercel-storage.com'],
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

// Serve the built React app when running as a standalone server (Vercel serves dist/ itself).
const dist = path.resolve('dist');
if (!process.env.VERCEL && fs.existsSync(dist)) {
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

export default app;
