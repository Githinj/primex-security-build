import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Camera } from '@/lib/types'

export async function getCameras(siteId?: string): Promise<Camera[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase.from('cameras').select('*').order('name')
  if (siteId) query = query.eq('site_id', siteId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getCameraById(id: string): Promise<Camera | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('cameras')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
