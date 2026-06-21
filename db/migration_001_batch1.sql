-- Batch 1 migration — run this once against your Neon database
-- (via Neon SQL editor, or `psql $DATABASE_URL -f db/migration_001_batch1.sql`)
--
-- Purely additive: safe to run even with existing rows in `users` / `battles`.
-- Existing battle status values are remapped: 'open' -> 'waiting', 'live' -> 'active'.

-- =========================================================
-- BATTLES: new columns
-- =========================================================
ALTER TABLE battles ADD COLUMN IF NOT EXISTS battle_code VARCHAR(8);
ALTER TABLE battles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill a unique short code for any existing rows that don't have one yet.
DO $$
DECLARE
  r RECORD;
  new_code VARCHAR(8);
BEGIN
  FOR r IN SELECT id FROM battles WHERE battle_code IS NULL LOOP
    LOOP
      new_code := upper(substr(md5(random()::text || r.id::text), 1, 6));
      IF NOT EXISTS (SELECT 1 FROM battles WHERE battle_code = new_code) THEN
        EXIT;
      END IF;
    END LOOP;
    UPDATE battles SET battle_code = new_code WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE battles ALTER COLUMN battle_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_battles_code ON battles (battle_code);

-- Remap status naming to: waiting, active, judging, completed, cancelled, expired
UPDATE battles SET status = 'waiting' WHERE status = 'open';
UPDATE battles SET status = 'active'  WHERE status = 'live';

-- Give existing 'waiting' battles with no expiry a 10-minute window from now,
-- so old rows don't immediately vanish the moment this migration runs.
UPDATE battles SET expires_at = now() + interval '10 minutes'
WHERE status = 'waiting' AND expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_battles_expires ON battles (status, expires_at);

-- =========================================================
-- BATTLE INVITES (challenge a specific user)
-- =========================================================
CREATE TABLE IF NOT EXISTS battle_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(140) NOT NULL,
  topic         VARCHAR(60) NOT NULL,
  battle_type   VARCHAR(20) NOT NULL DEFAULT 'friend',
  mode          VARCHAR(20) NOT NULL DEFAULT 'text',
  rounds        INTEGER NOT NULL DEFAULT 3,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, cancelled, expired
  battle_id     UUID REFERENCES battles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_invites_to ON battle_invites (to_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invites_from ON battle_invites (from_user_id, status, created_at DESC);

-- =========================================================
-- OTP CODES (email-change verification, future signup verification)
-- =========================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     VARCHAR(30) NOT NULL,        -- 'email_change', etc.
  code_hash   TEXT NOT NULL,
  new_email   VARCHAR(255),                -- staged new email, for purpose = 'email_change'
  attempts    INTEGER NOT NULL DEFAULT 0,
  consumed    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON otp_codes (user_id, purpose, consumed);
