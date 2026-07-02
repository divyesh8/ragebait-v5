-- Phase 5 migration: RageMind human intelligence engine.
-- Purely additive and safe to rerun.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION merge_jsonb_arrays(left_value jsonb, right_value jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_agg(DISTINCT value), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(left_value, '[]'::jsonb) || COALESCE(right_value, '[]'::jsonb)) AS items(value);
$$;

CREATE TABLE IF NOT EXISTS rage_mind_analysis_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id       UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  transcript_hash VARCHAR(96) NOT NULL,
  payload         JSONB NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  UNIQUE (battle_id, transcript_hash)
);

CREATE INDEX IF NOT EXISTS idx_rage_mind_cache_lookup
  ON rage_mind_analysis_cache (battle_id, transcript_hash, expires_at DESC);

CREATE TABLE IF NOT EXISTS battle_ragemind_reports (
  battle_id       UUID PRIMARY KEY REFERENCES battles(id) ON DELETE CASCADE,
  transcript_hash VARCHAR(96) NOT NULL,
  payload         JSONB NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_ragemind_memories (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  personality_traits    JSONB NOT NULL DEFAULT '[]'::jsonb,
  emotional_patterns    JSONB NOT NULL DEFAULT '[]'::jsonb,
  favorite_jokes        JSONB NOT NULL DEFAULT '[]'::jsonb,
  successful_strategies JSONB NOT NULL DEFAULT '[]'::jsonb,
  recurring_mistakes    JSONB NOT NULL DEFAULT '[]'::jsonb,
  cultural_signals      JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficult_opponents   JSONB NOT NULL DEFAULT '[]'::jsonb,
  best_battles          JSONB NOT NULL DEFAULT '[]'::jsonb,
  worst_battles         JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_ragemind_updated
  ON player_ragemind_memories (updated_at DESC);
