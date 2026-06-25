'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCompany(data: { name: string; type: string }) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('companies').insert(data)
  if (error) throw error
  revalidatePath('/companies')
}

export async function updateCompany(id: string, data: { name?: string; type?: string; status?: string }) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('companies').update(data).eq('id', id)
  if (error) throw error
  revalidatePath('/companies')
}
