'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

export async function createSite(data: { company_id: string; name: string; type: string; address: string; risk?: string }) {
  await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('sites').insert(data)
  if (error) throw error
  revalidatePath('/sites')
}

export async function toggleSiteStatus(id: string, newStatus: 'Active' | 'Inactive') {
  await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('sites').update({ status: newStatus }).eq('id', id)
  if (error) throw error
  revalidatePath('/sites')
}

export async function deleteSite(id: string) {
  await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('sites').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/sites')
}
