import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Alert } from '@/lib/types'

export async function getAlerts(siteId?: string): Promise<Alert[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase.from('alerts').select('*').order('created_at', { ascending: false })
  if (siteId) query = query.eq('site_id', siteId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getAlertById(id: string): Promise<Alert | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
