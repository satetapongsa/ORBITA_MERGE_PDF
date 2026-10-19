import pg from 'pg';
import { config } from './config.js';

// Neon connection strings carry sslmode/channel_binding; translate them into explicit
// pg options (pg warns about sslmode aliases and ignores channel_binding otherwise).
const url = new URL(config.databaseUrl);
const local = ['localhost', '127.0.0.1'].includes(url.hostname);
const channelBinding = url.searchParams.get('channel_binding') === 'require';
url.searchParams.delete('sslmode');
url.searchParams.delete('channel_binding');

export const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: local ? false : { rejectUnauthorized: true },
  enableChannelBinding: channelBinding,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export const query = (text, params) => pool.query(text, params);

export async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] ?? null;
}
