import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { one } from './db.js';

const COOKIE = 'ps_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function setSession(res, userId) {
  const token = jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: MAX_AGE_MS / 1000 });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

export async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Please sign in.' });
  try {
    const { sub } = jwt.verify(token, config.jwtSecret);
    const user = await one('SELECT id, username, email, created_at FROM users WHERE id = $1', [sub]);
    if (!user) throw new Error('missing user');
    req.user = user;
    next();
  } catch {
    clearSession(res);
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}
