-- Schema for gwdiscordbuilds.
-- Idempotent — safe to run on every startup.
--
-- Each row is scoped by (guild_id, user_scope).
--   user_scope = '_shared_'  → visible to everyone in the guild
--   user_scope = '<userId>'  → private to that user inside the guild
--
-- We use a generated column rather than NULL in the unique index because
-- MySQL treats NULLs as distinct values in unique constraints.

CREATE TABLE IF NOT EXISTS builds (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guild_id    VARCHAR(20)  NOT NULL,
  user_id     VARCHAR(20)  NULL,
  user_scope  VARCHAR(20)  GENERATED ALWAYS AS (COALESCE(user_id, '_shared_')) STORED,
  name        VARCHAR(64)  NOT NULL,
  name_key    VARCHAR(64)  NOT NULL,
  code        TEXT         NOT NULL,
  created_by  VARCHAR(20)  NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_build_scope_name (guild_id, user_scope, name_key),
  KEY idx_build_guild (guild_id),
  KEY idx_build_code  (code(64))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_builds (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  guild_id    VARCHAR(20)  NOT NULL,
  user_id     VARCHAR(20)  NULL,
  user_scope  VARCHAR(20)  GENERATED ALWAYS AS (COALESCE(user_id, '_shared_')) STORED,
  name        VARCHAR(64)  NOT NULL,
  name_key    VARCHAR(64)  NOT NULL,
  codes       JSON         NOT NULL,
  created_by  VARCHAR(20)  NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_team_scope_name (guild_id, user_scope, name_key),
  KEY idx_team_guild (guild_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
