import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Site } from '@/lib/types'

export async function getSites(companyId?: string): Promise<Site[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('sites')
    .select('*, cameras(count)')
    .order('name')
  if (companyId) query = query.eq('company_id', companyId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((s: any) => ({
    id: s.id,
    company_id: s.company_id,
    name: s.name,
    type: s.type,
    address: s.address,
    risk: s.risk,
    status: s.status,
    cameras: s.cameras[0]?.count ?? 0,
  }))
}

export async function getSiteById(id: string): Promise<Site | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*, cameras(count)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    id: data.id,
    company_id: data.company_id,
    name: data.name,
    type: data.type,
    address: data.address,
    risk: data.risk,
    status: data.status,
    cameras: data.cameras[0]?.count ?? 0,
  }
}
