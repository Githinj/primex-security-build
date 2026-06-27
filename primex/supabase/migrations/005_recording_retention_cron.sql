-- 005_recording_retention_cron.sql
-- Scheduled cleanup of old recordings and stream_events (SEC-91)

-- Enable pg_cron (available by default in Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Clean up stream_events older than 7 days — runs daily at 03:00 UTC
SELECT cron.schedule(
  'cleanup_old_stream_events',
  '0 3 * * *',
  $$DELETE FROM public.stream_events WHERE created_at < now() - interval '7 days'$$
);

-- Clean up recordings rows older than 30 days — runs daily at 03:15 UTC
-- Actual video files in DO Spaces are expired via bucket lifecycle policy
SELECT cron.schedule(
  'cleanup_old_recordings',
  '15 3 * * *',
  $$DELETE FROM public.recordings WHERE created_at < now() - interval '30 days'$$
);
