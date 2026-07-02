-- Phase 4 migration: AI matchmaking and personalized recommendation engine.
-- Purely additive and safe to rerun.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cached generated payloads. Recommendations are expensive enough to reuse
-- briefly, but short-lived so activity and trends still move the feed.
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cache_key    VARCHAR(80) NOT NULL,
  payload      JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  retry_count  INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  UNIQUE (user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expiry
  ON recommendation_cache (user_id, cache_key, expires_at DESC);

-- Materialized opponent recommendations for auditability and fast reuse.
CREATE TABLE IF NOT EXISTS match_recommendations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  compatibility_score      INTEGER NOT NULL,
  difficulty_rating        VARCHAR(30) NOT NULL,
  predicted_battle_quality INTEGER NOT NULL,
  predicted_win_chance     INTEGER NOT NULL,
  reason                   TEXT NOT NULL,
  generated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at               TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_match_recommendations_user
  ON match_recommendations (user_id, compatibility_score DESC, expires_at DESC);

-- User-level tuning knobs for Phase 4 and future user controls.
CREATE TABLE IF NOT EXISTS user_recommendation_preferences (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_difficulty VARCHAR(30) NOT NULL DEFAULT 'fair',
  diversity_level     INTEGER NOT NULL DEFAULT 60,
  muted_topics        JSONB NOT NULL DEFAULT '[]'::jsonb,
  muted_user_ids      JSONB NOT NULL DEFAULT '[]'::jsonb,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Global trend snapshots used by the feed and later background refresh jobs.
CREATE TABLE IF NOT EXISTS trend_analytics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_key VARCHAR(80) NOT NULL UNIQUE,
  payload      JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trend_analytics_generated
  ON trend_analytics (generated_at DESC);

