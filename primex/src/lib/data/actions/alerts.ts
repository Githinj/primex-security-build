'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAlert(data: { site_id: string; camera_id?: string | null; title: string; severity: string; description: string; source: string }) {
  const supabase = await createServerSupabaseClient()
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
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('alerts').update({ status }).eq('id', id)
  if (error) throw error
  revalidatePath('/alerts')
}
