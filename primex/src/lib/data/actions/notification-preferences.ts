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

/**
 * Upsert one channel of the current user's preference for an event, preserving
 * the other channel. Missing row defaults to enabled (opt-out model), matching
 * how the notify layer resolves recipients.
 */
export async function updateNotificationPreference(
  eventKey: string,
  channel: 'email' | 'push',
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('email, push')
      .eq('user_id', user.id)
      .eq('event_key', eventKey)
      .maybeSingle()

    const next = { email: existing?.email ?? true, push: existing?.push ?? true }
    next[channel] = enabled

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user.id, event_key: eventKey, email: next.email, push: next.push, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,event_key' },
      )
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to save preference' }
  }
}
