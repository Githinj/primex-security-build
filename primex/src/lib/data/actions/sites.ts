'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole, requireActiveCompany } from '@/lib/auth/require-role'
import { logActivity } from './activity'

export async function createSite(data: { company_id: string; name: string; type: string; address: string; risk?: string }) {
  const caller = await requireRole('super_admin', 'company_manager')
  await requireActiveCompany(caller)
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('sites').insert(data)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Site created', target: data.name, icon: 'MapPin', tone: 'blue' })
  revalidatePath('/sites')
}

export async function toggleSiteStatus(id: string, newStatus: 'Active' | 'Inactive') {
  const caller = await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('sites').update({ status: newStatus }).eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Site status changed', target: `${id} → ${newStatus}`, icon: 'MapPin', tone: 'gray' })
  revalidatePath('/sites')
}

export async function deleteSite(id: string) {
  const caller = await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('sites').delete().eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Site deleted', target: id, icon: 'MapPin', tone: 'red' })
  revalidatePath('/sites')
}
