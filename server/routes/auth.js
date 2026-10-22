import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { one } from '../db.js';
import { setSession, clearSession, requireAuth } from '../auth.js';
import { getAccountSummary } from '../plans.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', authLimiter, async (req, res) => {
  const username = String(req.body.username ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase() || null;
  const password = String(req.body.password ?? '');

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–32 characters: letters, numbers, dot, dash or underscore.' });
  }
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const hash = await bcrypt.hash(password, 12);
  try {
    const user = await one(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hash],
    );
    setSession(res, user.id);
    res.status(201).json({ user, account: await getAccountSummary(user.id) });
  } catch (err) {
    if (err.code === '23505') {
      const field = err.constraint?.includes('email') ? 'email' : 'username';
      return res.status(409).json({ error: `That ${field} is already registered.` });
    }
    throw err;
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const login = String(req.body.username ?? '').trim();
  const password = String(req.body.password ?? '');
  const row = await one(
    'SELECT id, username, email, created_at, password_hash FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($1)',
    [login],
  );
  const ok = row && (await bcrypt.compare(password, row.password_hash));
  if (!ok) return res.status(401).json({ error: 'Incorrect username or password.' });

  const { password_hash, ...user } = row;
  setSession(res, user.id);
  res.json({ user, account: await getAccountSummary(user.id) });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user, account: await getAccountSummary(req.user.id) });
});

router.put('/profile', requireAuth, authLimiter, async (req, res) => {
  const username = String(req.body.username ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase() || null;

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–32 characters: letters, numbers, dot, dash or underscore.' });
  }
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  try {
    const updated = await one(
      `UPDATE users
       SET username = $1, email = $2
       WHERE id = $3
       RETURNING id, username, email, created_at`,
      [username, email, req.user.id]
    );
    res.json({ user: updated });
  } catch (err) {
    if (err.code === '23505') {
      const field = err.constraint?.includes('email') ? 'email' : 'username';
      return res.status(409).json({ error: `That ${field} is already in use by another account.` });
    }
    throw err;
  }
});

router.post('/password', requireAuth, authLimiter, async (req, res) => {
  const current = String(req.body.currentPassword ?? '');
  const next = String(req.body.newPassword ?? '');
  if (next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  const row = await one('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!(await bcrypt.compare(current, row.password_hash))) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  await one('UPDATE users SET password_hash = $2 WHERE id = $1', [req.user.id, await bcrypt.hash(next, 12)]);
  res.json({ ok: true });
});

export default router;
