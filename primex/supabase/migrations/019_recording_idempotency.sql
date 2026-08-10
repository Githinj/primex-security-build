-- ============================================================
-- 019: one recordings row per stored file (SEC-179)
-- ============================================================
-- The antmedia webhook guarded duplicate `vodReady` deliveries by SELECTing on
-- file_url and skipping when a row came back. Nothing constrained the column, so
-- two concurrent redeliveries — which is exactly the shape of a webhook retry
-- storm — both miss the SELECT and both INSERT, double-listing the recording on
-- the timeline. A check-then-insert in application code is not idempotency; the
-- constraint is.
--
-- With this index in place the route upserts with ON CONFLICT DO NOTHING, so the
-- database arbitrates the race and the loser is told it lost (SEC-179). This is
-- the pattern billing_events.stripe_event_id already uses — CLAUDE.md described
-- it as mirroring the antmedia side, which had it backwards until now.
--
-- Idempotent per repo convention. No GRANT needed: recordings already carries
-- API-role grants from 003, and an index is not a new relation.
-- ============================================================

-- Collapse any duplicates already stored, keeping the earliest row so the id that
-- has been around longest (and may be linked from a report or a bookmark) is the
-- survivor. Deleting the row does not touch the MP4 in DO Spaces — the file is
-- expired by the bucket lifecycle policy, and the duplicate rows pointed at the
-- same object anyway.
DELETE FROM recordings r
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY file_url ORDER BY created_at, id
         ) AS rn
  FROM recordings
) ranked
WHERE r.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recordings_file_url_unique
  ON recordings (file_url);
