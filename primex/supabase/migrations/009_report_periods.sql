-- ============================================================
-- 009: Report period range
-- ============================================================
-- Reports previously carried only a single `date`, and the PDF renderer
-- inferred the covered window as that date's calendar month. To support
-- generating a report over an arbitrary date range, store the range
-- explicitly. Columns are nullable; legacy rows fall back to month-of-date.
-- ============================================================

ALTER TABLE reports ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS period_end   DATE;
