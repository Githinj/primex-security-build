'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface LogActivityParams {
  actorId: string
  actorName: string
  action: string
  target: string
  icon?: string
  tone?: 'red' | 'amber' | 'green' | 'blue' | 'gray'
}

export async function logActivity(params: LogActivityParams) {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.from('activity_log').insert({
      actor_id: params.actorId,
      actor_name: params.actorName,
      action: params.action,
      target: params.target,
      icon: params.icon ?? 'Activity',
      tone: params.tone ?? 'gray',
    })
  } catch {
    // Fire-and-forget: never block the mutation
  }
}
