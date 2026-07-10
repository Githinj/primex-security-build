'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

interface SubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}

/** Store (or refresh) the current user's browser push subscription. */
export async function savePushSubscription(
  sub: SubscriptionInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }
    if (!sub.endpoint || !sub.p256dh || !sub.auth) {
      return { success: false, error: 'Invalid subscription' }
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          user_agent: sub.userAgent ?? null,
        },
        { onConflict: 'endpoint' },
      )
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to save subscription' }
  }
}

/** Remove a push subscription (on unsubscribe / permission revoke). */
export async function deletePushSubscription(
  endpoint: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to remove subscription' }
  }
}
