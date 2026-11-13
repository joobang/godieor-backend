-- Documentary is a category; movie vs series remains explicit content.kind.
ALTER TABLE event DROP CONSTRAINT event_ott_category;
ALTER TABLE event ADD CONSTRAINT event_ott_category CHECK (
  (kind = 'ott_season_premiere' AND (ott_category IS NULL OR ott_category IN ('movie','series','original_series','variety','documentary','other')))
  OR (kind <> 'ott_season_premiere' AND ott_category IS NULL)
);
ALTER TABLE event DROP CONSTRAINT event_payload;
ALTER TABLE event ADD CONSTRAINT event_payload CHECK (
  (kind = 'theatrical_release' AND content_id IS NOT NULL AND content_type = 'movie' AND release_market IS NOT NULL AND home_team_id IS NULL AND away_team_id IS NULL)
  OR (kind = 'ott_season_premiere' AND content_id IS NOT NULL AND
      (content_type = 'drama' OR (content_type = 'movie' AND ott_category IN ('movie','documentary')))
      AND release_market ~ '^[A-Z]{2}$' AND home_team_id IS NULL AND away_team_id IS NULL)
  OR (kind = 'game_release' AND content_id IS NOT NULL AND content_type = 'game' AND release_market IS NOT NULL AND home_team_id IS NULL AND away_team_id IS NULL)
  OR (kind = 'epl_match' AND content_id IS NULL AND content_type IS NULL AND season_id IS NULL AND release_market IS NULL AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL AND home_team_id <> away_team_id)
);
ALTER TABLE event ADD CONSTRAINT documentary_movie_without_season CHECK (
  NOT (kind = 'ott_season_premiere' AND ott_category = 'documentary' AND content_type = 'movie') OR season_id IS NULL
);
