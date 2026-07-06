'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { signedPlaybackUrl } from '@/lib/storage/presign'

/**
 * Return a short-lived playback URL for a recording. The recording is fetched
 * under the caller's RLS (recordings_access scopes managers/clients/guards to
 * their company's cameras), then its stored URL is presigned so playback works
 * against a private bucket. Returns null if the recording isn't visible.
 */
export async function getRecordingPlaybackUrl(
  recordingId: string,
): Promise<{ url: string | null }> {
  await requireRole('super_admin', 'dispatcher', 'company_manager', 'client', 'guard')
  const supabase = await createServerSupabaseClient()
  const { data: recording } = await supabase
    .from('recordings')
    .select('file_url')
    .eq('id', recordingId)
    .single()
  if (!recording?.file_url) return { url: null }
  return { url: signedPlaybackUrl(recording.file_url) }
}
