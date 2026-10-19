import { config } from './config.js';
import { one } from './db.js';

const ACTIVE = ['active', 'trialing'];

export async function getSubscription(userId) {
  return one(
    `SELECT s.*, pa.provider
       FROM subscriptions s
       LEFT JOIN payment_accounts pa ON pa.id = s.payment_account_id
      WHERE s.user_id = $1
      ORDER BY (s.status = ANY($2)) DESC, s.updated_at DESC
      LIMIT 1`,
    [userId, ACTIVE],
  );
}

export function isActive(sub) {
  if (!sub || !ACTIVE.includes(sub.status)) return false;
  return !sub.current_period_end || new Date(sub.current_period_end) > new Date();
}

export async function getPlan(userId) {
  const sub = await getSubscription(userId);
  return { plan: isActive(sub) ? config.plans.pro : config.plans.free, subscription: sub };
}

// "Today" is evaluated in APP_TIMEZONE so the quota resets at local midnight.
const TODAY = `(now() AT TIME ZONE $2)::date`;

export async function getUsage(userId) {
  const row = await one(
    `SELECT COALESCE((SELECT count FROM daily_usage WHERE user_id = $1 AND usage_date = ${TODAY}), 0) AS used`,
    [userId, config.timezone],
  );
  return row.used;
}

/** Atomically take one export from today's allowance. Returns the new count, or null when the limit is reached. */
export async function consumeExport(userId, limit) {
  const row = await one(
    `INSERT INTO daily_usage (user_id, usage_date, count)
     VALUES ($1, ${TODAY}, 1)
     ON CONFLICT (user_id, usage_date)
     DO UPDATE SET count = daily_usage.count + 1 WHERE daily_usage.count < $3
     RETURNING count`,
    [userId, config.timezone, limit],
  );
  return row ? row.count : null;
}

/** Give an export back if the operation failed after the quota was taken. */
export async function refundExport(userId) {
  await one(
    `UPDATE daily_usage SET count = GREATEST(count - 1, 0)
      WHERE user_id = $1 AND usage_date = ${TODAY}`,
    [userId, config.timezone],
  );
}

/** Next local midnight in APP_TIMEZONE, as an ISO string. */
export function nextResetAt(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: config.timezone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  const wallAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMs = wallAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  const nextMidnightWall = Date.UTC(parts.year, parts.month - 1, Number(parts.day) + 1);
  return new Date(nextMidnightWall - offsetMs).toISOString();
}

export async function getAccountSummary(userId) {
  const [{ plan, subscription }, used] = await Promise.all([getPlan(userId), getUsage(userId)]);
  return {
    plan: plan.id,
    planName: plan.name,
    dailyLimit: plan.dailyLimit,
    used,
    remaining: Math.max(plan.dailyLimit - used, 0),
    resetsAt: nextResetAt(),
    timezone: config.timezone,
    subscription: subscription && {
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      provider: subscription.provider,
    },
  };
}
