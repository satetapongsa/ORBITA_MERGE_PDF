import express, { Router } from 'express';
import Stripe from 'stripe';
import { config, billingMode } from '../config.js';
import { one } from '../db.js';
import { requireAuth } from '../auth.js';
import { getAccountSummary, getSubscription, isActive } from '../plans.js';

const router = Router();
const stripe = billingMode === 'stripe' ? new Stripe(config.stripe.secretKey) : null;
const PRO = config.plans.pro;

async function getPaymentAccount(userId, provider) {
  return one('SELECT * FROM payment_accounts WHERE user_id = $1 AND provider = $2', [userId, provider]);
}

async function ensureStripeCustomer(user) {
  const existing = await getPaymentAccount(user.id, 'stripe');
  if (existing) return existing;
  const customer = await stripe.customers.create({
    name: user.username,
    email: user.email || undefined,
    metadata: { userId: user.id },
  });
  return one(
    `INSERT INTO payment_accounts (user_id, provider, provider_customer_id)
     VALUES ($1, 'stripe', $2)
     ON CONFLICT (user_id, provider) DO UPDATE SET provider_customer_id = payment_accounts.provider_customer_id
     RETURNING *`,
    [user.id, customer.id],
  );
}

/** Mirror a Stripe subscription object into our subscriptions table. */
async function syncStripeSubscription(sub) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const account = await one(
    `SELECT * FROM payment_accounts WHERE provider = 'stripe' AND provider_customer_id = $1`,
    [customerId],
  );
  if (!account) return console.warn(`Stripe subscription ${sub.id} has unknown customer ${customerId}`);
  // Newer API versions report the billing period on the subscription item.
  const periodEnd = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
  await one(
    `INSERT INTO subscriptions (user_id, payment_account_id, plan, status, provider_subscription_id,
                                current_period_end, cancel_at_period_end)
     VALUES ($1, $2, 'pro', $3, $4, to_timestamp($5), $6)
     ON CONFLICT (provider_subscription_id) DO UPDATE SET
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       updated_at = now()`,
    [account.user_id, account.id, sub.status, sub.id, periodEnd ?? null, Boolean(sub.cancel_at_period_end || sub.cancel_at)],
  );
}

// ---- Webhook (raw body, no session) -------------------------------------------------
export const webhookRouter = Router();
webhookRouter.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(404).end();
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripe.webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        await syncStripeSubscription(await stripe.subscriptions.retrieve(session.subscription));
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncStripeSubscription(event.data.object);
      break;
    default:
      break;
  }
  res.json({ received: true });
});

// ---- Authenticated billing endpoints --------------------------------------------
router.use(requireAuth);

router.get('/config', (req, res) => {
  res.json({ mode: billingMode, plans: config.plans, currency: 'THB' });
});

router.post('/checkout', async (req, res) => {
  const current = await getSubscription(req.user.id);
  if (isActive(current)) return res.status(409).json({ error: 'You already have an active Pro subscription.' });

  if (billingMode === 'mock') {
    // Local development only: activate Pro for one month without charging.
    const account = await one(
      `INSERT INTO payment_accounts (user_id, provider, provider_customer_id)
       VALUES ($1, 'mock', $2)
       ON CONFLICT (user_id, provider) DO UPDATE SET provider = 'mock' RETURNING *`,
      [req.user.id, `mock_${req.user.id}`],
    );
    await one(
      `INSERT INTO subscriptions (user_id, payment_account_id, plan, status, provider_subscription_id, current_period_end)
       VALUES ($1, $2, 'pro', 'active', 'mock_sub_' || gen_random_uuid(), now() + interval '1 month')`,
      [req.user.id, account.id],
    );
    return res.json({ url: '/account?checkout=success' });
  }

  const account = await ensureStripeCustomer(req.user);
  const lineItem = config.stripe.priceId
    ? { price: config.stripe.priceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: 'thb',
          unit_amount: PRO.priceThb * 100, // satang
          recurring: { interval: 'month' },
          product_data: { name: `PageSmith ${PRO.name} — ${PRO.dailyLimit} exports/day` },
        },
      };
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: account.provider_customer_id,
    client_reference_id: req.user.id,
    line_items: [lineItem],
    subscription_data: { metadata: { userId: req.user.id } },
    success_url: `${config.appUrl}/account?checkout=success`,
    cancel_url: `${config.appUrl}/account?checkout=cancelled`,
  });
  res.json({ url: session.url });
});

// Pull the latest state from Stripe (useful right after checkout if the webhook is still in flight).
router.post('/sync', async (req, res) => {
  if (stripe) {
    const account = await getPaymentAccount(req.user.id, 'stripe');
    if (account) {
      const subs = await stripe.subscriptions.list({ customer: account.provider_customer_id, status: 'all', limit: 5 });
      for (const sub of subs.data) await syncStripeSubscription(sub);
    }
  }
  res.json({ account: await getAccountSummary(req.user.id) });
});

// Stripe-hosted portal: update card, see invoices, cancel.
router.post('/portal', async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'The billing portal is only available with Stripe enabled.' });
  const account = await getPaymentAccount(req.user.id, 'stripe');
  if (!account) return res.status(400).json({ error: 'No billing account yet.' });
  const portal = await stripe.billingPortal.sessions.create({
    customer: account.provider_customer_id,
    return_url: `${config.appUrl}/account`,
  });
  res.json({ url: portal.url });
});

// Cancel at period end (Pro stays active until the paid month runs out). Toggle with resume=true.
router.post('/cancel', async (req, res) => {
  const resume = Boolean(req.body?.resume);
  const sub = await getSubscription(req.user.id);
  if (!isActive(sub)) return res.status(400).json({ error: 'No active subscription.' });
  if (stripe && sub.provider === 'stripe') {
    const updated = await stripe.subscriptions.update(sub.provider_subscription_id, { cancel_at_period_end: !resume });
    await syncStripeSubscription(updated);
  } else {
    await one('UPDATE subscriptions SET cancel_at_period_end = $2, updated_at = now() WHERE id = $1', [sub.id, !resume]);
  }
  res.json({ account: await getAccountSummary(req.user.id) });
});

export default router;
