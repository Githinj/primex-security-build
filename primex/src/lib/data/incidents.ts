import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Incident, IncidentUpdate } from '@/lib/types'

export async function getIncidents(siteId?: string): Promise<Incident[]>
export async function getIncidents(siteId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Incident>>
export async function getIncidents(siteId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
    if (siteId) query = query.eq('site_id', siteId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

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

// Defensive: returns [] on any error (e.g. before the 010 migration is applied)
// so incident pages never fail to render.
export async function getIncidentUpdates(incidentId: string): Promise<IncidentUpdate[]> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('incident_updates')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true })
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}
