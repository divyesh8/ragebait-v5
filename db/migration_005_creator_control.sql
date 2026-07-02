-- Founder-only creator control foundation.
-- This table is append-only by app convention: creator APIs should insert a row
-- for every action and never expose update/delete operations for this log.

CREATE TABLE IF NOT EXISTS creator_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  previous_value  JSONB,
  new_value       JSONB,
  reason          TEXT NOT NULL,
  ip_address      TEXT,
  browser         TEXT,
  device          TEXT,
  undo_status     TEXT NOT NULL DEFAULT 'not_available',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_audit_logs_created
  ON creator_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_audit_logs_target
  ON creator_audit_logs (target_user_id, created_at DESC);
