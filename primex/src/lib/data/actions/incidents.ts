'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

export async function createIncident(data: { site_id: string; alert_id: string; title: string; severity: string; notes?: string }) {
  await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').insert(data)
  if (error) throw error
  revalidatePath('/incidents')
}

export async function updateIncident(id: string, data: Record<string, unknown>) {
  await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').update(data).eq('id', id)
  if (error) throw error
  revalidatePath('/incidents')
}

export async function assignGuard(incidentId: string, guardId: string) {
  await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').update({ guard_id: guardId, status: 'Dispatched' }).eq('id', incidentId)
  if (error) throw error
  revalidatePath('/incidents')
}

export async function updateIncidentStatus(id: string, status: string) {
  await requireRole('super_admin', 'dispatcher', 'guard', 'company_manager')
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

  revalidatePath('/guard')
  revalidatePath('/incidents')
}
