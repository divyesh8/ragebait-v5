-- Phase 5 extension: RageMind X Battle DNA and Player DNA memory.
-- Additive and safe to rerun after migration_003_ragemind.sql.

ALTER TABLE battle_ragemind_reports
  ADD COLUMN IF NOT EXISTS battle_dna JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE player_ragemind_memories
  ADD COLUMN IF NOT EXISTS favorite_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS best_opponents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS worst_opponents JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS best_comeback TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS most_successful_strategy TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS favorite_humor_style TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS typical_argument_structure TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS growth_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS player_dna JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS battle_dna_snapshots (
  battle_id    UUID PRIMARY KEY REFERENCES battles(id) ON DELETE CASCADE,
  dna          JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_dna_snapshots (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dna          JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_dna_updated
  ON player_dna_snapshots (updated_at DESC);
