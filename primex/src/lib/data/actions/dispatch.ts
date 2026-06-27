'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

export async function dispatchGuard(alertId: string, guardId: string) {
  await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.rpc('dispatch_guard', {
    p_alert_id: alertId,
    p_guard_id: guardId,
  })
  if (error) throw error

  revalidatePath('/alerts')
  revalidatePath('/incidents')
  revalidatePath('/guards')
}
