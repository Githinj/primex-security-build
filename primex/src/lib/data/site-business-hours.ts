import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { SiteBusinessHours } from '@/lib/types'

export async function getSiteBusinessHours(siteId: string): Promise<SiteBusinessHours | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('site_business_hours')
    .select('*')
    .eq('site_id', siteId)
    .single()
  if (error) return null
  return data
}
