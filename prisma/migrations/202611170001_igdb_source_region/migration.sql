-- Existing IGDB source regions are unknown. Never backfill from the broad release_market.
ALTER TABLE event_source ADD COLUMN source_release_region integer;
ALTER TABLE event_source ADD CONSTRAINT event_source_release_region_check
  CHECK (source_release_region IS NULL OR source_release_region BETWEEN 1 AND 10);
