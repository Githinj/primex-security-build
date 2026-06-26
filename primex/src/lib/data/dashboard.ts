import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Alert, ActivityItem, Company } from '@/lib/types'

export interface CamerasByCompany {
  company: Company
  online: number
  offline: number
  maintenance: number
}

export interface DashboardStats {
  totalCompanies: number
  totalSites: number
  camerasOnline: number
  camerasOffline: number
  openAlerts: number
  activeIncidents: number
  resolvedToday: number
  guardsOnDuty: number
  avgResponseMinutes: number
  resolvedIncidentCount: number
  recentAlerts: Alert[]
  recentActivity: ActivityItem[]
  criticalAlerts: Alert[]
  camerasByCompany: CamerasByCompany[]
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
    { data: criticalAlertsData },
    { data: camerasRaw },
    { data: companiesRaw },
    { data: resolvedIncidentsData },
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
    supabase.from('alerts').select('*').eq('severity', 'Critical').neq('status', 'Closed').order('created_at', { ascending: false }).limit(5),
    supabase.from('cameras').select('id, status, site:sites!inner(company_id)'),
    supabase.from('companies').select('*'),
    supabase.from('incidents').select('started_at, updated_at').in('status', ['Resolved', 'Closed']),
  ])

  // Build camera counts by company
  const camerasData = ((camerasRaw ?? []) as unknown) as Array<{ id: string; status: string; site: { company_id: string } }>
  const companiesData = (companiesRaw ?? []) as Company[]
  const countsByCompany: Record<string, { online: number; offline: number; maintenance: number }> = {}
  for (const cam of camerasData) {
    const companyId = cam.site?.company_id
    if (!companyId) continue
    if (!countsByCompany[companyId]) countsByCompany[companyId] = { online: 0, offline: 0, maintenance: 0 }
    if (cam.status === 'Online') countsByCompany[companyId].online++
    else if (cam.status === 'Offline') countsByCompany[companyId].offline++
    else if (cam.status === 'Maintenance') countsByCompany[companyId].maintenance++
  }
  const camerasByCompany: CamerasByCompany[] = companiesData.map((c) => ({
    company: c,
    online: countsByCompany[c.id]?.online ?? 0,
    offline: countsByCompany[c.id]?.offline ?? 0,
    maintenance: countsByCompany[c.id]?.maintenance ?? 0,
  }))

  // Compute average response time from resolved incidents
  const resolvedIncidents = (resolvedIncidentsData ?? []) as Array<{ started_at: string; updated_at: string }>
  let avgResponseMinutes = 0
  if (resolvedIncidents.length > 0) {
    const totalMinutes = resolvedIncidents.reduce((sum, inc) => {
      const diff = new Date(inc.updated_at).getTime() - new Date(inc.started_at).getTime()
      return sum + diff / 60_000
    }, 0)
    avgResponseMinutes = Math.round(totalMinutes / resolvedIncidents.length)
  }

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
    avgResponseMinutes,
    resolvedIncidentCount: resolvedIncidents.length,
    criticalAlerts: (criticalAlertsData ?? []) as Alert[],
    camerasByCompany,
  }
}
