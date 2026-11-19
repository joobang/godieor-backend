-- Multiple canonical content rows may independently refer to one TMDB work.
CREATE TABLE "ott_tmdb_identity" (
  "content_id" UUID NOT NULL PRIMARY KEY,
  "tmdb_kind" TEXT NOT NULL,
  "tmdb_id" INTEGER NOT NULL,
  "verification" TEXT NOT NULL,
  "verified_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ott_tmdb_identity_content_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE RESTRICT,
  CONSTRAINT "ott_tmdb_identity_kind_check" CHECK ("tmdb_kind" IN ('tv', 'movie')),
  CONSTRAINT "ott_tmdb_identity_id_check" CHECK ("tmdb_id" > 0)
);
CREATE INDEX "ott_tmdb_identity_tmdb_idx" ON "ott_tmdb_identity" ("tmdb_kind", "tmdb_id");
