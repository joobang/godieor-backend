# DATA-14 Netflix November 2026 official listing review staging

- Requirements: PROD-005/007/009. Baseline backend 37332db, app dd7d181, verifier a46c480. Contracts, migrations and acceptance unchanged.
- Source: Netflix Tudum https://www.netflix.com/tudum/articles/new-on-netflix?lv=true (accessed November 11 2026). Manually transcribed 69 dated title rows from Nov 1-17 sections, limited excerpt rather than complete month. Date and title are source availability data, not Korean premiere claims.
- Risks: global availability mistaken for KR first release, duplicate or incorrect seasons, page edits and uncertain image rights. Unknown kind retained unless the source expressly showed a season. market=null, premiereConfirmed=false, imageUrl=null.
- Commands: node scripts/stage-ott-lineup.mjs data/lineups/netflix-2026-11-tudum-observed.json => created 69 / stored 80 / published 0; replay unchanged 69. Prior DB OTT 7 according to past record, no DB query/publish in this task. node --test tests/netflix-tudum.test.mjs tests/ott-lineup.test.mjs => 9/9. npm test => 75/75.
- Independent verification, cloud migration, production publication and poster collection were not run. LEARN-ID N/A: source provenance and safety decisions recorded in ADR-015.
- Next: source-by-source KR premiere checks, then manual review and publish only confirmed rows.
