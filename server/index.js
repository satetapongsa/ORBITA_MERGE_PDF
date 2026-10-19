import { config, billingMode } from './config.js';
import { pool } from './db.js';
import { storageMode } from './storage.js';
import app from './app.js';

// Standalone server for local development and hosts like Render/Railway.

// Verify the database is reachable and the schema exists before accepting traffic.
try {
  await pool.query('SELECT 1 FROM users LIMIT 1');
} catch (err) {
  console.error(`Database check failed: ${err.message}\nRun "npm run db:migrate" after setting DATABASE_URL.`);
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`PageSmith API on http://localhost:${config.port} (billing: ${billingMode}, storage: ${storageMode}, timezone: ${config.timezone})`);
});
