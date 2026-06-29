import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Alert } from '@/lib/types'

export async function getAlerts(siteId?: string): Promise<Alert[]>
export async function getAlerts(siteId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Alert>>
export async function getAlerts(siteId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('alerts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (siteId) query = query.eq('site_id', siteId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

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
