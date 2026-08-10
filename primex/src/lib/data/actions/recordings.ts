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

/**
 * Place or lift an evidentiary hold on a recording (SEC-190).
 *
 * Retention deletes footage on a 30-day clock, so a request from a client, an
 * insurer or the police that arrives on day 29 has two days to be acted on.
 * Incident-linked footage is held automatically by migration 020 — this is for
 * everything that doesn't have an incident attached.
 *
 * Not open to `client` or `guard`: a hold is a retention decision with a cost,
 * and RLS would otherwise let a client pin their own company's footage
 * indefinitely.
 *
 * `until = null` lifts the hold and puts the recording back on the normal clock.
 */
export async function setRecordingHold(
  recordingId: string,
  until: Date | null,
): Promise<{ success: boolean; error?: string }> {
  await requireRole('super_admin', 'dispatcher', 'company_manager')

  if (until && until.getTime() <= Date.now()) {
    // A hold in the past reads as "held" in the UI but is ignored by the purge —
    // exactly the kind of quiet disagreement this issue is about.
    return { success: false, error: 'A hold must end in the future.' }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('recordings')
    .update({ hold_until: until?.toISOString() ?? null })
    .eq('id', recordingId)

  if (error) {
    console.error('Failed to set recording hold:', error)
    return { success: false, error: 'Could not save the hold.' }
  }

  return { success: true }
}
