'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

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

  const { error } = await supabase.rpc('create_alert_with_incident', {
    p_title: data.title,
    p_site_id: data.site_id,
    p_camera_id: data.camera_id ?? null,
    p_severity: data.severity,
    p_description: data.description || '',
    p_source: data.source,
  })
  if (error) throw error

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
