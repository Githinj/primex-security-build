import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Company } from '@/lib/types'

export async function getCompanies(): Promise<Company[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*, sites(count), profiles(count)')
    .order('name')
  if (error) throw error
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    sites: c.sites[0]?.count ?? 0,
    users: c.profiles[0]?.count ?? 0,
  }))
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*, sites(count), profiles(count)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    status: data.status,
    sites: data.sites[0]?.count ?? 0,
    users: data.profiles[0]?.count ?? 0,
  }
}
