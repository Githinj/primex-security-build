import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Camera } from '@/lib/types'

export async function getCameras(siteId?: string): Promise<Camera[]>
export async function getCameras(siteId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Camera>>
export async function getCameras(siteId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('cameras')
      .select('*', { count: 'exact' })
      .order('name')
    if (siteId) query = query.eq('site_id', siteId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

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
