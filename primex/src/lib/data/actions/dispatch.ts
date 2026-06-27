'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { logActivity } from './activity'

export async function dispatchGuard(alertId: string, guardId: string) {
  const caller = await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.rpc('dispatch_guard', {
    p_alert_id: alertId,
    p_guard_id: guardId,
  })
  if (error) throw error

  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Dispatched guard', target: `${guardId} → alert ${alertId}`, icon: 'Radio', tone: 'amber' })
  revalidatePath('/alerts')
  revalidatePath('/incidents')
  revalidatePath('/guards')
}
