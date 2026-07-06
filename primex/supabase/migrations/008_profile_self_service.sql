-- ============================================================
-- 008: Profile self-service (Settings → Profile)
-- ============================================================
-- Adds the columns and storage the Settings → Profile tab needs to
-- persist edits (name/phone already existed; timezone + avatar are new),
-- an avatars storage bucket with per-user RLS, and a trigger that keeps
-- profiles.email in sync when a user confirms an email change.
-- ============================================================

-- ---------- 1. New profile columns ----------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone   TEXT DEFAULT 'Australia/Sydney';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ---------- 2. Avatars storage bucket ----------
-- Public read (avatars render via a plain URL); writes are restricted by the
-- per-user policies below. Uploads run server-side via the service role, but
-- these policies also make direct client uploads safe if we add them later.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- A user may only write within a folder named after their own uid: <uid>/...
DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 3. Keep profiles.email in sync with auth ----------
-- Email changes go through Supabase Auth (updateUser + confirmation link).
-- auth.users.email only flips once the new address is confirmed; mirror that
-- into profiles.email so the app's own column never drifts.
CREATE OR REPLACE FUNCTION handle_user_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_email_change();
