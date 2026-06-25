import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

export async function getGuards(): Promise<Profile[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'guard')
    .order('full_name')
  if (error) throw error
  return data ?? []
}

export async function getGuardById(id: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .eq('role', 'guard')
    .single()
  if (error) return null
  return data
}
