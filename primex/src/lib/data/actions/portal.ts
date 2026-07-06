'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { logActivity } from './activity'

/**
 * Let a business client report an issue at their own site. Creates a
 * client-sourced alert + linked incident so dispatch picks it up.
 *
 * The site id comes from the client, so we re-validate that it belongs to the
 * caller's company before writing — `create_alert_with_incident` is SECURITY
 * DEFINER and bypasses RLS, so this check is what keeps a client from filing
 * against another company's site.
 */
export async function reportClientIssue(input: {
  siteId: string
  title: string
  description: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const caller = await requireRole('client')
    if (!caller.companyId) {
      return { success: false, error: 'No company is associated with your account.' }
    }

    const title = input.title.trim()
    if (!title) return { success: false, error: 'Please describe the issue.' }

    const supabase = await createServerSupabaseClient()
    const { data: site } = await supabase
      .from('sites')
      .select('id, name')
      .eq('id', input.siteId)
      .eq('company_id', caller.companyId)
      .single()
    if (!site) return { success: false, error: 'Site not found for your account.' }

    const { error } = await supabase.rpc('create_alert_with_incident', {
      p_title: title,
      p_site_id: site.id,
      p_camera_id: null,
      p_severity: 'Warning',
      p_description: input.description.trim() || '',
      p_source: 'client_report',
    })
    if (error) return { success: false, error: error.message }

    logActivity({
      actorId: caller.userId,
      actorName: caller.fullName,
      action: 'Issue reported',
      target: title,
      icon: 'Bell',
      tone: 'amber',
    })

    revalidatePath('/portal')
    revalidatePath('/alerts')
    revalidatePath('/incidents')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to submit report.' }
  }
}
