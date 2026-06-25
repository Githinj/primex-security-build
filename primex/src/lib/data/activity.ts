import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { ActivityItem } from '@/lib/types'

export async function getActivity(limit = 20): Promise<ActivityItem[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select('*, profiles:actor_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((a: any) => ({
    id: a.id,
    who: a.profiles?.full_name ?? 'System',
    action: a.action,
    target: a.target,
    created_at: a.created_at,
    icon: a.icon,
    tone: a.tone,
  }))
}
