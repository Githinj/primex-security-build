import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Subscription } from '@/lib/types'

// Defensive read — returns null on any error (or when there's no company) so the
// Settings page never fails to render. Mirrors getNotificationPreferences().
export async function getCompanySubscription(
  companyId: string | null | undefined
): Promise<Subscription | null> {
  if (!companyId) return null
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()
    if (error || !data) return null
    return data as Subscription
  } catch {
    return null
  }
}
