-- ============================================================
-- 018: one camera per Ant Media stream_id (SEC-176)
-- ============================================================
-- `cameras.stream_id` is the key everything in the streaming path resolves on:
-- getStreamToken() mints a play token for whatever value sits in the row, and the
-- antmedia webhook looks the camera up by it. Nothing constrained the value, so a
-- company_manager could set one of *their own* cameras' stream_id to another
-- tenant's and read that tenant's live feed — RLS scopes which row you can write,
-- not what you may put in it. The server-side half of the fix lives in
-- lib/data/actions/cameras.ts (only super_admin may set stream_id); this is the
-- database-level backstop.
--
-- The index also removes the sequential scan the webhook performs on every
-- liveStreamStarted / liveStreamEnded / vodReady delivery.
--
-- Idempotent per repo convention. No GRANT needed: cameras already carries
-- API-role grants from 001 (SEC-154), and an index is not a new relation.
-- ============================================================

-- Release duplicate claims before the unique index goes on, keeping the earliest
-- claimant. A camera whose stream_id is cleared here shows status indicators only
-- until an admin reassigns it — deliberately preferred over failing the migration.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY stream_id ORDER BY created_at, id
         ) AS rn
  FROM cameras
  WHERE stream_id IS NOT NULL
)
UPDATE cameras c
SET stream_id = NULL
FROM ranked r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cameras_stream_id_unique
  ON cameras (stream_id)
  WHERE stream_id IS NOT NULL;
