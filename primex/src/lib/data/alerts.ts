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

/** Statuses that count as "needs attention" — the same set the nav badge uses. */
export const OPEN_ALERT_STATUSES = ['New', 'Reviewing', 'Escalated'] as const

export interface NotificationAlert {
  id: string
  title: string
  severity: Alert['severity']
  created_at: string
  site_name: string | null
}

/**
 * Newest open alerts for the notification menu.
 *
 * Deliberately narrow: this runs in the `(app)` layout, so it is on the path of
 * *every* authenticated page render. It selects four columns plus the site name
 * rather than `*`, and never touches `frame_url` / `ai_metadata`.
 *
 * Returns [] on error instead of throwing — a failed notification query must not
 * blank the whole app shell.
 */
export async function getRecentAlerts(limit = 6): Promise<NotificationAlert[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('alerts')
    .select('id, title, severity, created_at, sites(name)')
    .in('status', OPEN_ALERT_STATUSES)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentAlerts] could not load alerts:', error.message)
    return []
  }

  return (data ?? []).map((row) => {
    // PostgREST types an embedded to-one as an array; at runtime it is an
    // object. Handle both rather than trusting either.
    const site = row.sites as unknown as { name?: string } | { name?: string }[] | null
    const resolved = Array.isArray(site) ? site[0] : site
    return {
      id: row.id,
      title: row.title,
      severity: row.severity,
      created_at: row.created_at,
      site_name: resolved?.name ?? null,
    }
  })
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
