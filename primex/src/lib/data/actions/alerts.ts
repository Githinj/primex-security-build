'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

// NOTE: The AI detection Edge Function (supabase/functions/ai-event-ingest/index.ts)
// duplicates this alert+incident insert pattern. If the schema changes,
// update both this file and the Edge Function in lockstep.
export async function createAlert(data: { site_id: string; camera_id?: string | null; title: string; severity: string; description: string; source: string }) {
  const caller = await requireRole('super_admin', 'company_manager', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  if (caller.role === 'company_manager' && caller.companyId) {
    const { data: company } = await supabase
      .from('companies')
      .select('status')
      .eq('id', caller.companyId)
      .single()
    if (company?.status !== 'Active') {
      throw new Error('Your company must be approved before you can perform this action')
    }
  }
  const { data: alertData, error: alertError } = await supabase
    .from('alerts')
    .insert(data)
    .select('id')
    .single()
  if (alertError) throw alertError

  // Auto-create linked incident
  await supabase.from('incidents').insert({
    title: data.title,
    site_id: data.site_id,
    alert_id: alertData.id,
    severity: data.severity,
    status: 'Open',
    guard_id: null,
    started_at: new Date().toISOString(),
    notes: data.description || null,
  })

  revalidatePath('/alerts')
  revalidatePath('/incidents')
}

export async function updateAlertStatus(id: string, status: string) {
  await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('alerts').update({ status }).eq('id', id)
  if (error) throw error
  revalidatePath('/alerts')
}
