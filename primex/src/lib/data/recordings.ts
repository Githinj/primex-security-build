import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Recording } from '@/lib/types'

export async function getRecordings(
  cameraId: string,
  from: string,
  to: string
): Promise<Recording[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('camera_id', cameraId)
    .gte('started_at', from)
    .lte('started_at', to)
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
