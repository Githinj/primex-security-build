'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { logActivity } from './activity'

export async function createIncident(data: { site_id: string; alert_id: string; title: string; severity: string; notes?: string }) {
  const caller = await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').insert(data)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Incident created', target: data.title, icon: 'ClipboardList', tone: 'amber' })
  revalidatePath('/incidents')
}

export async function updateIncident(id: string, data: Record<string, unknown>) {
  const caller = await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').update(data).eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Incident updated', target: id, icon: 'ClipboardList', tone: 'amber' })
  revalidatePath('/incidents')
}

export async function assignGuard(incidentId: string, guardId: string) {
  const caller = await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').update({ guard_id: guardId, status: 'Dispatched' }).eq('id', incidentId)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Guard assigned', target: incidentId, icon: 'Radio', tone: 'amber' })
  revalidatePath('/incidents')
}

export async function updateIncidentStatus(id: string, status: string) {
  const caller = await requireRole('super_admin', 'dispatcher', 'guard', 'company_manager')
  const supabase = await createServerSupabaseClient()

  if (status === 'Resolved') {
    const { error } = await supabase.rpc('resolve_incident', {
      p_incident_id: id,
      p_status: status,
    })
    if (error) throw error
  } else {
    const { error } = await supabase.from('incidents').update({ status }).eq('id', id)
    if (error) throw error
  }

  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: `Incident ${status.toLowerCase()}`, target: id, icon: status === 'Resolved' ? 'CheckCircle' : 'ClipboardList', tone: status === 'Resolved' ? 'green' : 'amber' })
  revalidatePath('/guard')
  revalidatePath('/incidents')
}
