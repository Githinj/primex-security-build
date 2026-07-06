-- ============================================================
-- 011: Company contact + plan fields
-- ============================================================
-- The invite/edit company modals collect a primary contact, contact email, and
-- plan tier, but there was nowhere to store them (and the detail page invented
-- a plan from the site count). Persist them as real columns.
--
-- NOTE: `plan` here is just a stored tier label chosen by the admin — it is not
-- billing. Real subscriptions (SEC-129) remain separate.
-- ============================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_contact TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email   TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan            TEXT;
