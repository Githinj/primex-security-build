'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type NotificationPrefs = Record<string, { email: boolean; push: boolean }>

/**
 * Current user's notification preferences, keyed by event. Defensive: returns an
 * empty map on any error (e.g. before the 007 migration is applied) so the
 * Settings page never fails to render.
 */
export async function getNotificationPreferences(): Promise<NotificationPrefs> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('event_key, email, push')
      .eq('user_id', user.id)
    if (error) return {}

    const map: NotificationPrefs = {}
    for (const row of data ?? []) {
      const r = row as { event_key: string; email: boolean; push: boolean }
      map[r.event_key] = { email: r.email, push: r.push }
    }
    return map
  } catch {
    return {}
  }
}

/** Upsert the current user's preference for one event. */
export async function updateNotificationPreference(
  eventKey: string,
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Single toggle drives both channels for now (email-first; push mirrors it
    // until per-channel controls ship with web push).
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user.id, event_key: eventKey, email: enabled, push: enabled, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,event_key' },
      )
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to save preference' }
  }
}
