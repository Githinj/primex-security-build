import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Recording } from '@/lib/types'

export async function getRecordings(
  cameraId: string,
  from: string,
  to: string
): Promise<Recording[]> {
  const supabase = await createServerSupabaseClient()
  // Overlap, not containment (SEC-191). Filtering on `started_at BETWEEN from AND
  // to` drops a recording that began before the window and is still running
  // inside it — the long recording covering "now" is exactly the one a scrubber
  // needs. The timeline re-filters client-side for overlap, logic that could
  // never fire because the row it would match was already excluded here.
  //
  // `ended_at IS NULL` means still recording, so it extends to now by definition.
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('camera_id', cameraId)
    .lte('started_at', to)
    .or(`ended_at.is.null,ended_at.gte.${from}`)
    .eq('status', 'complete')
    .order('started_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getRecordingById(id: string): Promise<Recording | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
