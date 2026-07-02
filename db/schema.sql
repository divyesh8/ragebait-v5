-- Run this once against your Neon / Vercel Postgres database
-- e.g. via the Neon SQL editor, or `psql $DATABASE_URL -f db/schema.sql`
--
-- If you already ran the first version of this file (just the `users`
-- table), it's safe to run this whole file again — every statement uses
-- IF NOT EXISTS, so existing tables/columns are left alone and only the
-- new battle-related tables are added.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(32) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  aura          INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 1,
  xp            INTEGER NOT NULL DEFAULT 0,
  wins          INTEGER NOT NULL DEFAULT 0,
  losses        INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak   INTEGER NOT NULL DEFAULT 0,
  bio           TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

-- =========================================================
-- AURA TRANSACTIONS
-- Permanent log of every Aura change for a user.
-- =========================================================
CREATE TABLE IF NOT EXISTS aura_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  battle_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aura_tx_user ON aura_transactions (user_id, created_at DESC);

-- =========================================================
-- BATTLES
-- =========================================================
CREATE TABLE IF NOT EXISTS battles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(140) NOT NULL,
  topic           VARCHAR(60) NOT NULL,
  battle_type     VARCHAR(20) NOT NULL DEFAULT 'casual', -- casual, ranked, friend, tournament, group, event
  mode            VARCHAR(20) NOT NULL DEFAULT 'text',    -- text, image, meme
  status          VARCHAR(20) NOT NULL DEFAULT 'open',    -- open, live, judging, completed, cancelled
  created_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  rounds          INTEGER NOT NULL DEFAULT 3,             -- messages per participant before judging
  winner_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  ai_summary      TEXT,
  ai_scores       JSONB,                                  -- { [userId]: { humor, creativity, ... , total } }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_battles_status ON battles (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battles_creator ON battles (created_by);
CREATE INDEX IF NOT EXISTS idx_battles_opponent ON battles (opponent_id);

-- =========================================================
-- BATTLE MESSAGES
-- Each roast/message posted in a battle.
-- =========================================================
CREATE TABLE IF NOT EXISTS battle_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id   UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  round       INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_battle_messages_battle ON battle_messages (battle_id, created_at ASC);

-- =========================================================
-- RAGEMIND AI (PHASE 5)
-- Human intelligence engine cache and long-term player memory.
-- =========================================================
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
  battle_dna      JSONB NOT NULL DEFAULT '{}'::jsonb,
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
  favorite_topics        JSONB NOT NULL DEFAULT '[]'::jsonb,
  best_opponents         JSONB NOT NULL DEFAULT '[]'::jsonb,
  worst_opponents        JSONB NOT NULL DEFAULT '[]'::jsonb,
  best_comeback          TEXT NOT NULL DEFAULT '',
  most_successful_strategy TEXT NOT NULL DEFAULT '',
  favorite_humor_style   TEXT NOT NULL DEFAULT '',
  typical_argument_structure TEXT NOT NULL DEFAULT '',
  growth_timeline        JSONB NOT NULL DEFAULT '[]'::jsonb,
  player_dna             JSONB NOT NULL DEFAULT '{}'::jsonb,
  difficult_opponents   JSONB NOT NULL DEFAULT '[]'::jsonb,
  best_battles          JSONB NOT NULL DEFAULT '[]'::jsonb,
  worst_battles         JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_ragemind_updated
  ON player_ragemind_memories (updated_at DESC);

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
