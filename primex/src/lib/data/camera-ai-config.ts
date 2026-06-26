import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { CameraAiConfig } from '@/lib/types'

export async function getCameraAiConfig(cameraId: string): Promise<CameraAiConfig | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('camera_ai_config')
    .select('*')
    .eq('camera_id', cameraId)
    .single()
  if (error) return null
  return data
}
