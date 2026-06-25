'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAlert(data: { site_id: string; camera_id?: string | null; title: string; severity: string; description: string; source: string }) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('alerts').insert(data)
  if (error) throw error
  revalidatePath('/alerts')
}

export async function updateAlertStatus(id: string, status: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('alerts').update({ status }).eq('id', id)
  if (error) throw error
  revalidatePath('/alerts')
}
