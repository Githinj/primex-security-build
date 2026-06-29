import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { Profile } from '@/lib/types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function getTeamMembers(): Promise<Profile[]>
export async function getTeamMembers(pagination: PaginationParams): Promise<PaginatedResult<Profile>>
export async function getTeamMembers(pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('full_name')
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult(data ?? [], count, pagination)
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')
  if (error) throw error
  return data ?? []
}
