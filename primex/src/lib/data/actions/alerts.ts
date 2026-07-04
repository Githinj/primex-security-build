'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole, requireActiveCompany } from '@/lib/auth/require-role'
import { logActivity } from './activity'
import { notifyCriticalAlert } from '@/lib/notifications/notify'

export async function createAlert(data: { site_id: string; camera_id?: string | null; title: string; severity: string; description: string; source: string }) {
  const caller = await requireRole('super_admin', 'company_manager', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  await requireActiveCompany(caller)

  const { error } = await supabase.rpc('create_alert_with_incident', {
    p_title: data.title,
    p_site_id: data.site_id,
    p_camera_id: data.camera_id ?? null,
    p_severity: data.severity,
    p_description: data.description || '',
    p_source: data.source,
  })
  if (error) throw error

  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Alert created', target: data.title, icon: 'Bell', tone: data.severity === 'Critical' ? 'red' : 'amber' })

  // Notify company managers + clients on critical alerts (self-contained; never throws).
  await notifyCriticalAlert({ siteId: data.site_id, title: data.title, severity: data.severity, description: data.description })

  revalidatePath('/alerts')
  revalidatePath('/incidents')
}

export async function updateAlertStatus(id: string, status: string) {
  const caller = await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('alerts').update({ status }).eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: `Alert ${status.toLowerCase()}`, target: id, icon: 'Bell', tone: status === 'Closed' ? 'green' : 'amber' })
  revalidatePath('/alerts')
}
