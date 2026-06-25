import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Incident } from '@/lib/types'

export async function getIncidents(siteId?: string): Promise<Incident[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase.from('incidents').select('*').order('started_at', { ascending: false })
  if (siteId) query = query.eq('site_id', siteId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
