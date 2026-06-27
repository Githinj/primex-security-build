'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole, requireActiveCompany } from '@/lib/auth/require-role'
import { logActivity } from './activity'

export async function createCamera(data: { site_id: string; name: string; location: string; status?: string }) {
  const caller = await requireRole('super_admin', 'company_manager')
  await requireActiveCompany(caller)
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('cameras').insert(data)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Camera added', target: data.name, icon: 'Camera', tone: 'blue' })
  revalidatePath('/cameras')
}

export async function updateCamera(id: string, data: { name?: string; location?: string; status?: string; stream_id?: string | null }) {
  const caller = await requireRole('super_admin')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('cameras').update(data).eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Camera updated', target: data.name ?? id, icon: 'Camera', tone: 'gray' })
  revalidatePath('/cameras')
  revalidatePath(`/cameras/${id}`)
}

export async function deleteCamera(id: string) {
  const caller = await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('cameras').delete().eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Camera removed', target: id, icon: 'Camera', tone: 'red' })
  revalidatePath('/cameras')
}
