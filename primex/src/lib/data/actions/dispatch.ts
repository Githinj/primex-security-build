'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

export async function dispatchGuard(alertId: string, guardId: string) {
  await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()

  // 1. Get the alert
  const { data: alert } = await supabase
    .from('alerts')
    .select('*')
    .eq('id', alertId)
    .single()

  if (!alert) throw new Error('Alert not found')

  // 2. Create incident linked to the alert
  const { error: incidentError } = await supabase
    .from('incidents')
    .insert({
      title: alert.title,
      site_id: alert.site_id,
      alert_id: alertId,
      severity: alert.severity,
      status: 'Dispatched',
      guard_id: guardId,
      started_at: new Date().toISOString(),
      notes: alert.description,
    })

  if (incidentError) throw incidentError

  // 3. Update alert status to Escalated
  await supabase
    .from('alerts')
    .update({ status: 'Escalated' })
    .eq('id', alertId)

  // 4. Update guard status to On Incident
  await supabase
    .from('profiles')
    .update({ guard_status: 'On Incident' })
    .eq('id', guardId)

  revalidatePath('/alerts')
  revalidatePath('/incidents')
  revalidatePath('/guards')
}
