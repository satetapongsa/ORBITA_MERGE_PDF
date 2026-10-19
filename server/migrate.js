import fs from 'node:fs/promises';
import { pool } from './db.js';

const sql = await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8');
await pool.query(sql);
console.log('Database schema is up to date.');
await pool.end();
