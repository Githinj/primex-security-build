import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Report } from '@/lib/types'

function mapReport(r: any): Report {
  return {
    id: r.id,
    name: r.name,
    company_id: r.company_id,
    company_name: r.companies?.name ?? '',
    date: r.date,
    type: r.type,
    incident_count: r.incidents,
    size: r.size,
  }
}

export async function getReports(companyId?: string): Promise<Report[]>
export async function getReports(companyId: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<Report>>
export async function getReports(companyId?: string, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('reports')
      .select('*, companies(name)', { count: 'exact' })
      .order('date', { ascending: false })
    if (companyId) query = query.eq('company_id', companyId)
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult((data ?? []).map(mapReport), count, pagination)
  }

  let query = supabase
    .from('reports')
    .select('*, companies(name)')
    .order('date', { ascending: false })
  if (companyId) query = query.eq('company_id', companyId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(mapReport)
}
