-- ============================================================
-- 012: Guard on-scene stage
-- ============================================================
-- The incident_status enum (Open/In Progress/Dispatched/Resolved/Closed) can't
-- distinguish the guard's finer lifecycle (Accepted → En Route → Arrived), which
-- all collapse to "In Progress". Store the guard's current stage separately so
-- progress survives reload and dispatcher views can see it.
-- ============================================================

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS guard_stage TEXT;
