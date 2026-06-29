import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Profile } from '@/lib/types'

export async function getGuards(): Promise<Profile[]>
export async function getGuards(pagination: PaginationParams): Promise<PaginatedResult<Profile>>
export async function getGuards(pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'guard')
      .order('full_name')
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'guard')
    .order('full_name')
  if (error) throw error
  return data ?? []
}

export async function getGuardById(id: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'guard')
    .single()
  if (error) return null
  return data
}
