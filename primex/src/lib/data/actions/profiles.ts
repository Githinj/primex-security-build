'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

export async function updateProfile(id: string, data: Record<string, unknown>) {
  await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('profiles').update(data).eq('id', id)
  if (error) throw error
  revalidatePath('/team')
}

export async function toggleProfileStatus(id: string, active: boolean) {
  await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('profiles').update({ status: active ? 'Active' : 'Inactive' }).eq('id', id)
  if (error) throw error
  revalidatePath('/team')
}

export async function deleteProfile(id: string) {
  await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('profiles').update({ status: 'Removed' }).eq('id', id)
  if (error) throw error
  revalidatePath('/team')
}
