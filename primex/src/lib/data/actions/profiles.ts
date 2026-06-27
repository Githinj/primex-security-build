'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { logActivity } from './activity'

export async function updateProfile(id: string, data: Record<string, unknown>) {
  const caller = await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('profiles').update(data).eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'User profile updated', target: (data.full_name as string) ?? id, icon: 'UserCog', tone: 'gray' })
  revalidatePath('/team')
}

export async function toggleProfileStatus(id: string, active: boolean) {
  const caller = await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('profiles').update({ status: active ? 'Active' : 'Inactive' }).eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: active ? 'User activated' : 'User deactivated', target: id, icon: 'UserCog', tone: active ? 'green' : 'amber' })
  revalidatePath('/team')
}

export async function deleteProfile(id: string) {
  const caller = await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('profiles').update({ status: 'Removed' }).eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'User removed', target: id, icon: 'UserMinus', tone: 'red' })
  revalidatePath('/team')
}
