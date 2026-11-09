-- GODIEOR DB 계약 0.1.0-draft.1 / SYS-02 / 2026-11-09
-- 검토용 DDL. Prisma migration이 아니며 DB에 적용하지 않았다.
-- UUID는 쓰기 주체가 생성한다. PostgreSQL/Prisma 버전 고정 후 실제 migration으로 옮긴다.
CREATE TYPE content_kind AS ENUM ('movie', 'drama', 'game');
CREATE TYPE category AS ENUM ('movie', 'ott', 'game', 'epl');
CREATE TYPE event_kind AS ENUM ('theatrical_release', 'ott_season_premiere', 'game_release', 'epl_match');
CREATE TYPE event_status AS ENUM ('scheduled', 'postponed', 'cancelled');
CREATE TYPE time_precision AS ENUM ('instant', 'date_only', 'unknown');
CREATE TYPE ott_service AS ENUM ('netflix', 'disney_plus', 'coupang_play', 'tving');
CREATE TYPE game_device AS ENUM ('pc', 'playstation', 'xbox', 'switch');
CREATE TYPE data_origin AS ENUM ('fixture', 'provider');
CREATE TYPE coverage_state AS ENUM ('unconfigured', 'unsupported', 'partial', 'available');
CREATE TYPE attempt_state AS ENUM ('never', 'running', 'succeeded', 'failed');

CREATE TABLE catalog_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  published_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO catalog_state (singleton) VALUES (true);

CREATE TABLE app_user (
  id uuid PRIMARY KEY,
  display_name text,
  favorites_version bigint NOT NULL DEFAULT 1 CHECK (favorites_version > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_identity (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider = 'google'),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  UNIQUE (provider, subject)
);
CREATE TABLE service_session (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);
CREATE INDEX session_user_idx ON service_session(user_id);
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  country text NOT NULL DEFAULT 'KR' CHECK (country ~ '^[A-Z]{2}$'),
  time_zone text NOT NULL DEFAULT 'Asia/Seoul',
  view_mode text NOT NULL DEFAULT 'calendar' CHECK (view_mode IN ('calendar', 'cards')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- 신규 계정 생성 트랜잭션에서 movie/ott 두 행을 넣는다. 기존 계정 로그인 시 재삽입 금지.
CREATE TABLE user_enabled_category (
  user_id uuid NOT NULL REFERENCES user_settings(user_id) ON DELETE CASCADE,
  category category NOT NULL,
  PRIMARY KEY (user_id, category)
);
CREATE TABLE user_service_filter (
  user_id uuid NOT NULL REFERENCES user_settings(user_id) ON DELETE CASCADE,
  service ott_service NOT NULL,
  PRIMARY KEY (user_id, service)
);
CREATE TABLE user_device_filter (
  user_id uuid NOT NULL REFERENCES user_settings(user_id) ON DELETE CASCADE,
  device game_device NOT NULL,
  PRIMARY KEY (user_id, device)
);

CREATE TABLE content (
  id uuid PRIMARY KEY,
  kind content_kind NOT NULL,
  title text NOT NULL CHECK (length(title) > 0),
  original_title text,
  poster_url text,
  synopsis text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, kind)
);
CREATE TABLE drama_season (
  id uuid PRIMARY KEY,
  content_id uuid NOT NULL,
  content_type content_kind NOT NULL DEFAULT 'drama' CHECK (content_type = 'drama'),
  season_number integer NOT NULL CHECK (season_number > 0),
  FOREIGN KEY (content_id, content_type) REFERENCES content(id, kind),
  UNIQUE (content_id, season_number),
  UNIQUE (id, content_id)
);
CREATE TABLE team (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) > 0)
);
CREATE TABLE event (
  id uuid PRIMARY KEY,
  kind event_kind NOT NULL,
  content_id uuid,
  content_type content_kind,
  season_id uuid,
  title text NOT NULL CHECK (length(title) > 0),
  status event_status NOT NULL DEFAULT 'scheduled',
  precision time_precision NOT NULL,
  instant_at timestamptz,
  local_date date,
  source_time_zone text,
  announced_year integer CHECK (announced_year BETWEEN 1900 AND 9999),
  announced_period text,
  release_market text CHECK (release_market ~ '^([A-Z]{2}|WORLD)$'),
  venue_country text CHECK (venue_country ~ '^[A-Z]{2}$'),
  home_team_id uuid REFERENCES team(id),
  away_team_id uuid REFERENCES team(id),
  origin data_origin NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (content_id, content_type) REFERENCES content(id, kind),
  FOREIGN KEY (season_id, content_id) REFERENCES drama_season(id, content_id),
  UNIQUE (id, kind),
  CONSTRAINT event_payload CHECK (
    (kind = 'theatrical_release' AND content_id IS NOT NULL AND content_type IS NOT NULL AND content_type = 'movie' AND release_market IS NOT NULL AND home_team_id IS NULL AND away_team_id IS NULL)
    OR (kind = 'ott_season_premiere' AND content_id IS NOT NULL AND content_type IS NOT NULL AND content_type = 'drama' AND release_market IS NOT NULL AND release_market ~ '^[A-Z]{2}$' AND home_team_id IS NULL AND away_team_id IS NULL)
    OR (kind = 'game_release' AND content_id IS NOT NULL AND content_type IS NOT NULL AND content_type = 'game' AND release_market IS NOT NULL AND home_team_id IS NULL AND away_team_id IS NULL)
    OR (kind = 'epl_match' AND content_id IS NULL AND content_type IS NULL AND season_id IS NULL AND release_market IS NULL AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL AND home_team_id <> away_team_id)
  ),
  CHECK (kind = 'ott_season_premiere' OR season_id IS NULL),
  CONSTRAINT event_time CHECK (
    (precision = 'instant' AND instant_at IS NOT NULL AND local_date IS NULL AND announced_year IS NULL AND announced_period IS NULL)
    OR (precision = 'date_only' AND local_date IS NOT NULL AND instant_at IS NULL AND source_time_zone IS NULL AND announced_year IS NULL AND announced_period IS NULL)
    OR (precision = 'unknown' AND instant_at IS NULL AND local_date IS NULL AND source_time_zone IS NULL)
  )
);
CREATE INDEX event_instant_idx ON event(instant_at, id) WHERE precision = 'instant';
CREATE INDEX event_date_idx ON event(local_date, id) WHERE precision = 'date_only';
CREATE INDEX event_unknown_idx ON event(id) WHERE precision = 'unknown';
CREATE INDEX event_content_idx ON event(content_id);
CREATE INDEX event_season_idx ON event(season_id);
CREATE TABLE event_service (
  event_id uuid NOT NULL,
  event_type event_kind NOT NULL DEFAULT 'ott_season_premiere' CHECK (event_type = 'ott_season_premiere'),
  service ott_service NOT NULL,
  FOREIGN KEY (event_id, event_type) REFERENCES event(id, kind),
  PRIMARY KEY (event_id, service)
);
CREATE TABLE event_device (
  event_id uuid NOT NULL,
  event_type event_kind NOT NULL DEFAULT 'game_release' CHECK (event_type = 'game_release'),
  device game_device NOT NULL,
  FOREIGN KEY (event_id, event_type) REFERENCES event(id, kind),
  PRIMARY KEY (event_id, device)
);
-- 최소 하나의 service/device, 실제 IANA/국가 코드 등은 README의 공개 전 검증 책임을 따른다.
CREATE TABLE content_favorite (
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES content(id),
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_id)
);
CREATE TABLE event_favorite (
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES event(id),
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);
CREATE INDEX content_favorite_target_idx ON content_favorite(content_id);
CREATE INDEX event_favorite_target_idx ON event_favorite(event_id);

CREATE TABLE provider (
  key text PRIMARY KEY,
  name text NOT NULL,
  origin data_origin NOT NULL
);
CREATE TABLE content_source (
  provider_key text NOT NULL REFERENCES provider(key),
  external_id text NOT NULL,
  content_type content_kind NOT NULL,
  content_id uuid NOT NULL,
  FOREIGN KEY (content_id, content_type) REFERENCES content(id, kind),
  PRIMARY KEY (provider_key, content_type, external_id)
);
CREATE TABLE event_source (
  provider_key text NOT NULL REFERENCES provider(key),
  external_id text NOT NULL,
  variant_key text NOT NULL,
  event_id uuid NOT NULL REFERENCES event(id),
  source_url text NOT NULL,
  observed_at timestamptz NOT NULL,
  source_updated_at timestamptz,
  PRIMARY KEY (provider_key, external_id, variant_key)
);
CREATE INDEX event_source_event_idx ON event_source(event_id);
CREATE TABLE collection_scope (
  id uuid PRIMARY KEY,
  provider_key text NOT NULL REFERENCES provider(key),
  category category NOT NULL,
  scope_market text NOT NULL CHECK (scope_market ~ '^([A-Z]{2}|WORLD)$'),
  coverage coverage_state NOT NULL DEFAULT 'unconfigured',
  last_attempt_status attempt_state NOT NULL DEFAULT 'never',
  last_attempt_at timestamptz,
  last_successful_at timestamptz,
  last_error_code text,
  UNIQUE (provider_key, category, scope_market)
);
CREATE TABLE collection_run (
  id uuid PRIMARY KEY,
  scope_id uuid NOT NULL REFERENCES collection_scope(id),
  mode text NOT NULL CHECK (mode IN ('backfill', 'daily')),
  status attempt_state NOT NULL CHECK (status <> 'never'),
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  error_code text,
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);
CREATE TABLE event_change (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES event(id),
  catalog_revision bigint NOT NULL CHECK (catalog_revision > 0),
  changed_at timestamptz NOT NULL DEFAULT now(),
  before_value jsonb,
  after_value jsonb NOT NULL,
  CHECK (jsonb_typeof(after_value) = 'object'),
  CHECK (before_value IS NULL OR jsonb_typeof(before_value) = 'object')
);
CREATE INDEX event_change_event_idx ON event_change(event_id, catalog_revision DESC);
