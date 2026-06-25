'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createIncident(data: { site_id: string; alert_id: string; title: string; severity: string; notes?: string }) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').insert(data)
  if (error) throw error
  revalidatePath('/incidents')
}

export async function updateIncident(id: string, data: Record<string, unknown>) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').update(data).eq('id', id)
  if (error) throw error
  revalidatePath('/incidents')
}

export async function assignGuard(incidentId: string, guardId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').update({ guard_id: guardId, status: 'Dispatched' }).eq('id', incidentId)
  if (error) throw error
  revalidatePath('/incidents')
}
