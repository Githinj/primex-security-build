'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

export async function createCompany(data: { name: string; type: string }) {
  await requireRole('super_admin')
  const supabase = await createServerSupabaseClient()
  const { data: company, error } = await supabase.from('companies').insert(data).select('id').single()
  if (error) throw error
  revalidatePath('/companies')
  return company
}

export async function updateCompany(id: string, data: { name?: string; type?: string; status?: string }) {
  await requireRole('super_admin')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('companies').update(data).eq('id', id)
  if (error) throw error
  revalidatePath('/companies')
}
