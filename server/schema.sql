-- PageSmith schema (Neon / PostgreSQL). Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       TEXT NOT NULL,
  email          TEXT,
  password_hash  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email)) WHERE email IS NOT NULL;

-- One payment account per user per provider (e.g. their Stripe customer).
CREATE TABLE IF NOT EXISTS payment_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL,             -- 'stripe' | 'mock'
  provider_customer_id  TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_customer_id),
  UNIQUE (user_id, provider)
);

-- Subscription status, linked to the payment account that pays for it.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_account_id        UUID REFERENCES payment_accounts(id) ON DELETE SET NULL,
  plan                      TEXT NOT NULL DEFAULT 'pro',
  status                    TEXT NOT NULL,         -- active | trialing | past_due | canceled | incomplete ...
  provider_subscription_id  TEXT UNIQUE,
  current_period_end        TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions (user_id);

-- Exports per user per calendar day (day boundary = APP_TIMEZONE midnight).
CREATE TABLE IF NOT EXISTS daily_usage (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date  DATE NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

-- Metadata for files kept in each user's private storage folder.
CREATE TABLE IF NOT EXISTS files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,                     -- 'upload' | 'output'
  name          TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL,
  page_count    INTEGER,
  storage_key   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS files_user_idx ON files (user_id, created_at DESC);
-- Text indexing state for the assistant: NULL (not yet), ready, empty (no text layer), failed, skipped.
ALTER TABLE files ADD COLUMN IF NOT EXISTS text_status TEXT;

-- Extracted text per page, searched by the assistant (trigram index works for Thai too).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE IF NOT EXISTS file_pages (
  file_id   UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_no   INTEGER NOT NULL,
  content   TEXT NOT NULL,
  PRIMARY KEY (file_id, page_no)
);
CREATE INDEX IF NOT EXISTS file_pages_user_idx ON file_pages (user_id);
CREATE INDEX IF NOT EXISTS file_pages_content_trgm ON file_pages USING gin (content gin_trgm_ops);

-- Assistant messages per day (separate from exports).
ALTER TABLE daily_usage ADD COLUMN IF NOT EXISTS chat_count INTEGER NOT NULL DEFAULT 0;
