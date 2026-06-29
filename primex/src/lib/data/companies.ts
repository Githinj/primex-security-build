import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Company } from '@/lib/types'

function mapCompany(c: any): Company {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    sites: c.sites[0]?.count ?? 0,
    users: c.profiles[0]?.count ?? 0,
  }
}

// getCompanies has no filter param — overload shape differs from other query functions
export async function getCompanies(): Promise<Company[]>
export async function getCompanies(pagination: PaginationParams): Promise<PaginatedResult<Company>>
export async function getCompanies(pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('companies')
      .select('*, sites(count), profiles(count)', { count: 'exact' })
      .order('name')
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult((data ?? []).map(mapCompany), count, pagination)
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*, sites(count), profiles(count)')
    .order('name')
  if (error) throw error
  return (data ?? []).map(mapCompany)
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*, sites(count), profiles(count)')
    .eq('id', id)
    .single()
  if (error) return null
  return mapCompany(data)
}
