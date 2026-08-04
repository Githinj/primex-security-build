'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { normalizeBusinessHours, type BusinessHoursMap } from '@/lib/business-hours'
import { logActivity } from './activity'

export interface BusinessHoursInput {
  timezone: string
  hours: BusinessHoursMap
}

/**
 * Upsert a site's business hours.
 *
 * Re-validated here rather than trusting the form: the Python worker reads this
 * JSON straight out of the table and calls `time.fromisoformat()` on it, so a
 * malformed value raises inside the camera task instead of surfacing to anyone.
 */
export async function updateSiteBusinessHours(siteId: string, input: BusinessHoursInput) {
  const caller = await requireRole('super_admin', 'company_manager')

  if (!input.timezone?.trim()) throw new Error('Timezone is required.')

  const hours = normalizeBusinessHours(input.hours)

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('site_business_hours')
    .upsert(
      { site_id: siteId, timezone: input.timezone.trim(), hours },
      { onConflict: 'site_id' },
    )
  if (error) throw error

  logActivity({
    actorId: caller.userId,
    actorName: caller.fullName,
    action: 'Business hours updated',
    target: siteId,
    icon: 'Clock',
    tone: 'blue',
  })
  revalidatePath(`/sites/${siteId}`)
}
