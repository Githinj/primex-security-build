import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Site } from '@/lib/types'

function mapSite(s: any): Site {
  return {
    id: s.id,
    company_id: s.company_id,
    name: s.name,
    type: s.type,
    address: s.address,
    risk: s.risk,
    status: s.status,
    cameras: s.cameras[0]?.count ?? 0,
  }
}

export async function getSites(companyId?: string): Promise<Site[]>
export async function getSites(companyId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Site>>
export async function getSites(companyId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('sites')
      .select('*, cameras(count)', { count: 'exact' })
      .order('name')
    if (companyId) query = query.eq('company_id', companyId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult((data ?? []).map(mapSite), count, pagination)
  }

  let query = supabase
    .from('sites')
    .select('*, cameras(count)')
    .order('name')
  if (companyId) query = query.eq('company_id', companyId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapSite)
}

export async function getSiteById(id: string): Promise<Site | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*, cameras(count)')
    .eq('id', id)
    .single()
  if (error) return null
  return mapSite(data)
}
