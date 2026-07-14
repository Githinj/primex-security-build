-- ============================================================
-- 017: RTSP pull-ingest source URL for cameras (SEC-161)
-- ============================================================
-- Adds the RTSP/RTSPS source that Ant Media connects OUT to and republishes
-- under stream_id as WebRTC/HLS (a broadcast of type "streamSource"). This is the
-- pull counterpart to stream_url, which holds the RTMP PUSH ingest endpoint a
-- camera publishes into. Nullable — only set for pull-mode cameras.
--
-- No GRANT needed: cameras already carries API-role grants from 001 (see SEC-154);
-- adding a column to an already-granted table does not require re-granting.
-- Idempotent per repo convention.
-- ============================================================

ALTER TABLE cameras ADD COLUMN IF NOT EXISTS source_url TEXT;
