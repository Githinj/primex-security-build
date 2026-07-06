'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { logActivity } from './activity'

type Result = { success: boolean; error?: string; reportId?: string }

function formatRangeLabel(startISO: string, endISO: string): string {
  const s = new Date(`${startISO}T00:00:00`)
  const e = new Date(`${endISO}T00:00:00`)
  const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()
  if (sameMonth) {
    return s.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
  }
  const fmt = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(s)} – ${fmt(e)}`
}

/**
 * Aggregate a company's incidents/alerts over a date range and persist a report
 * row. The PDF itself is rendered on-demand at download (generateReportPdf),
 * which reads the same period_start/period_end range back.
 *
 * Insert uses the service role: company_manager has SELECT-only RLS on `reports`
 * (only super_admin has FOR ALL), so we bypass RLS and instead scope by hand —
 * a manager is always pinned to their own company.
 */
export async function createReport(input: {
  companyId: string
  type: string
  periodStart: string // yyyy-mm-dd
  periodEnd: string // yyyy-mm-dd
}): Promise<Result> {
  try {
    const caller = await requireRole('super_admin', 'company_manager')

    const companyId =
      caller.role === 'company_manager' ? caller.companyId : input.companyId
    if (!companyId) return { success: false, error: 'Select a company for this report.' }

    if (!input.periodStart || !input.periodEnd) {
      return { success: false, error: 'Choose a start and end date.' }
    }
    if (input.periodStart > input.periodEnd) {
      return { success: false, error: 'Start date must be on or before the end date.' }
    }
    const type = input.type || 'Custom'

    const supabase = await createServerSupabaseClient()

    // Validate the company exists (and, for super_admin, that the chosen id is real).
    const { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()
    if (!company) return { success: false, error: 'Company not found.' }

    // Company's sites → scope the aggregation. (super_admin/dispatcher aren't
    // constrained by RLS, so scope explicitly by site id.)
    const { data: companySites } = await supabase
      .from('sites')
      .select('id')
      .eq('company_id', companyId)
    const siteIds = (companySites ?? []).map((s: { id: string }) => s.id)

    const rangeStart = `${input.periodStart}T00:00:00`
    const rangeEnd = `${input.periodEnd}T23:59:59`

    let incidentCount = 0
    let alertCount = 0
    if (siteIds.length > 0) {
      const [{ count: inc }, { count: alt }] = await Promise.all([
        supabase
          .from('incidents')
          .select('id', { count: 'exact', head: true })
          .in('site_id', siteIds)
          .gte('started_at', rangeStart)
          .lte('started_at', rangeEnd),
        supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .in('site_id', siteIds)
          .gte('created_at', rangeStart)
          .lte('created_at', rangeEnd),
      ])
      incidentCount = inc ?? 0
      alertCount = alt ?? 0
    }

    const label = formatRangeLabel(input.periodStart, input.periodEnd)
    const name = `${label} ${type} Report`

    // The actual PDF is generated on download, so we don't have a real byte
    // count — estimate one from the content volume for display.
    const sizeKb = 40 + incidentCount * 3 + alertCount * 2
    const size = sizeKb < 1024 ? `${sizeKb} KB` : `${(sizeKb / 1024).toFixed(1)} MB`

    const admin = createAdminSupabaseClient()
    const { data: inserted, error } = await admin
      .from('reports')
      .insert({
        name,
        company_id: companyId,
        date: input.periodEnd,
        type,
        incidents: incidentCount,
        size,
        period_start: input.periodStart,
        period_end: input.periodEnd,
      })
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }

    logActivity({
      actorId: caller.userId,
      actorName: caller.fullName,
      action: 'Report generated',
      target: name,
      icon: 'FileText',
      tone: 'blue',
    })

    revalidatePath('/reports')
    revalidatePath('/manager')
    return { success: true, reportId: inserted?.id }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to generate report.' }
  }
}
