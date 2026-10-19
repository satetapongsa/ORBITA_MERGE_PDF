import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { one } from '../db.js';
import { requireAuth } from '../auth.js';
import { getPlan } from '../plans.js';
import { indexPending } from '../text.js';
import { ask, assistantEnabled } from '../assistant.js';

const router = Router();
router.use(requireAuth);

const TODAY = `(now() AT TIME ZONE $2)::date`;
const LIMIT = config.assistant.dailyLimit;

async function chatUsed(userId) {
  const row = await one(
    `SELECT COALESCE((SELECT chat_count FROM daily_usage WHERE user_id = $1 AND usage_date = ${TODAY}), 0) AS n`,
    [userId, config.timezone],
  );
  return row.n;
}

// Only branding is exposed — never the provider or model id.
router.get('/info', async (req, res) => {
  const { plan } = await getPlan(req.user.id);
  res.json({
    name: config.assistant.name,
    enabled: assistantEnabled(),
    allowed: plan.id === 'pro',
    used: await chatUsed(req.user.id),
    limit: LIMIT,
  });
});

const burst = rateLimit({
  windowMs: 60_000,
  limit: 12,
  keyGenerator: (req) => req.user.id,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'You are sending messages too quickly. Please wait a moment.' },
});

router.post('/chat', burst, async (req, res) => {
  if (!assistantEnabled()) return res.status(503).json({ error: 'The assistant is not configured yet.' });
  const { plan } = await getPlan(req.user.id);
  if (plan.id !== 'pro') {
    return res.status(403).json({ code: 'PRO_REQUIRED', error: `${config.assistant.name} is included with the Pro plan (20 THB/month).` });
  }

  const history = (Array.isArray(req.body.messages) ? req.body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (history.at(-1)?.role !== 'user') return res.status(400).json({ error: 'Type a question first.' });

  const counted = await one(
    `INSERT INTO daily_usage (user_id, usage_date, count, chat_count) VALUES ($1, ${TODAY}, 0, 1)
     ON CONFLICT (user_id, usage_date) DO UPDATE SET chat_count = daily_usage.chat_count + 1
       WHERE daily_usage.chat_count < $3
     RETURNING chat_count`,
    [req.user.id, config.timezone, LIMIT],
  );
  if (!counted) {
    return res.status(429).json({ error: `You've reached today's limit of ${LIMIT} assistant messages. It resets at midnight.` });
  }

  try {
    await indexPending(req.user.id);
    const { reply, sources } = await ask(req.user, history);
    res.json({ reply, sources, used: counted.chat_count, limit: LIMIT });
  } catch (err) {
    await one(
      `UPDATE daily_usage SET chat_count = GREATEST(chat_count - 1, 0) WHERE user_id = $1 AND usage_date = ${TODAY}`,
      [req.user.id, config.timezone],
    );
    throw err;
  }
});

export default router;
