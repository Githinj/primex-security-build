import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Alert, ActivityItem } from '@/lib/types'

export interface DashboardStats {
  totalCompanies: number
  totalSites: number
  camerasOnline: number
  camerasOffline: number
  openAlerts: number
  activeIncidents: number
  resolvedToday: number
  guardsOnDuty: number
  recentAlerts: Alert[]
  recentActivity: ActivityItem[]
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createServerSupabaseClient()

  const [
    { count: totalCompanies },
    { count: totalSites },
    { count: camerasOnline },
    { count: camerasOffline },
    { count: openAlerts },
    { count: activeIncidents },
    { count: resolvedToday },
    { count: guardsOnDuty },
    { data: recentAlerts },
    { data: activityData },
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('sites').select('*', { count: 'exact', head: true }),
    supabase.from('cameras').select('*', { count: 'exact', head: true }).eq('status', 'Online'),
    supabase.from('cameras').select('*', { count: 'exact', head: true }).neq('status', 'Online'),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).in('status', ['New', 'Reviewing', 'Escalated']),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['Open', 'In Progress', 'Dispatched']),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'Resolved').gte('updated_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'guard').in('guard_status', ['Available', 'On Incident']),
    supabase.from('alerts').select('*').in('status', ['New', 'Reviewing', 'Escalated']).order('created_at', { ascending: false }).limit(5),
    supabase.from('activity_log').select('*, profiles:actor_id(full_name)').order('created_at', { ascending: false }).limit(10),
  ])

  return {
    totalCompanies: totalCompanies ?? 0,
    totalSites: totalSites ?? 0,
    camerasOnline: camerasOnline ?? 0,
    camerasOffline: camerasOffline ?? 0,
    openAlerts: openAlerts ?? 0,
    activeIncidents: activeIncidents ?? 0,
    resolvedToday: resolvedToday ?? 0,
    guardsOnDuty: guardsOnDuty ?? 0,
    recentAlerts: recentAlerts ?? [],
    recentActivity: (activityData ?? []).map((a: any) => ({
      id: a.id,
      who: a.profiles?.full_name ?? 'System',
      action: a.action,
      target: a.target,
      created_at: a.created_at,
      icon: a.icon,
      tone: a.tone,
    })),
  }
}
