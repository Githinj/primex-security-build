import { createServerSupabaseClient } from '@/lib/supabase/server'
import { applyPagination, toPaginatedResult } from './pagination'
import type { PaginationParams, PaginatedResult } from './pagination'
import type { ActivityItem } from '@/lib/types'

function mapActivity(a: any): ActivityItem {
  return {
    id: a.id,
    who: a.profiles?.full_name ?? 'System',
    action: a.action,
    target: a.target,
    created_at: a.created_at,
    icon: a.icon,
    tone: a.tone,
  }
}

// Overload 1: legacy — limited fetch, returns flat array
export async function getActivity(limit?: number): Promise<ActivityItem[]>
// Overload 2: paginated — limit param ignored, uses page/pageSize
export async function getActivity(limit: number | undefined, pagination: PaginationParams): Promise<PaginatedResult<ActivityItem>>
export async function getActivity(limit = 20, pagination?: PaginationParams) {
  const supabase = await createServerSupabaseClient()

  if (pagination) {
    let query = supabase
      .from('activity_log')
      .select('*, profiles:actor_id(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
    query = applyPagination(query, pagination)
    const { data, error, count } = await query
    if (error) throw error
    return toPaginatedResult((data ?? []).map(mapActivity), count, pagination)
  }

  const { data, error } = await supabase
    .from('activity_log')
    .select('*, profiles:actor_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(mapActivity)
}
