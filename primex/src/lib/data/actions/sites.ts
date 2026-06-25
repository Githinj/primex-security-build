'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSite(data: { company_id: string; name: string; type: string; address: string; risk?: string }) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('sites').insert(data)
  if (error) throw error
  revalidatePath('/sites')
}
