CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS release_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_key TEXT NOT NULL,
  subscription_id UUID NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL CHECK (media_id > 0),
  episode INTEGER NOT NULL CHECK (episode > 0),
  display_title VARCHAR(240) NOT NULL,
  airing_at BIGINT NOT NULL CHECK (airing_at > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  UNIQUE (subscription_id, reminder_key)
);

CREATE INDEX IF NOT EXISTS release_reminders_due_idx
  ON release_reminders (airing_at)
  WHERE cancelled_at IS NULL AND sent_at IS NULL;

CREATE INDEX IF NOT EXISTS release_reminders_subscription_idx
  ON release_reminders (subscription_id, cancelled_at);

CREATE INDEX IF NOT EXISTS push_subscriptions_cleanup_idx
  ON push_subscriptions (disabled_at, last_seen_at);
