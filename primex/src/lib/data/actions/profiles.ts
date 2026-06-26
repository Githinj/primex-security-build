'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(id: string, data: Record<string, unknown>) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('profiles').update(data).eq('id', id)
  if (error) throw error
  revalidatePath('/team')
}

export async function toggleProfileStatus(id: string, active: boolean) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('profiles').update({ status: active ? 'Active' : 'Inactive' }).eq('id', id)
  if (error) throw error
  revalidatePath('/team')
}

export async function deleteProfile(id: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('profiles').update({ status: 'Removed' }).eq('id', id)
  if (error) throw error
  revalidatePath('/team')
}
