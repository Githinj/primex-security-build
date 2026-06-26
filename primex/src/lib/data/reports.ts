import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Report } from '@/lib/types'

export async function getReports(companyId?: string): Promise<Report[]> {
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('reports')
    .select('*, companies(name)')
    .order('date', { ascending: false })
  if (companyId) query = query.eq('company_id', companyId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    company_id: r.company_id,
    company_name: r.companies?.name ?? '',
    date: r.date,
    type: r.type,
    incident_count: r.incidents,
    size: r.size,
  }))
}
