// Standalone server for local development and hosts like Render/Railway.
let modules;
try {
  modules = await Promise.all([import('./config.js'), import('./db.js'), import('./storage.js'), import('./app.js')]);
} catch (err) {
  console.error(err.isConfigError ? err.message : err);
  process.exit(1);
}
const [{ config, billingMode }, { pool }, { storageMode }, { default: app }] = modules;

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
