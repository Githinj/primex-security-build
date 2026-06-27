'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { logActivity } from './activity'

export async function createCompany(data: { name: string; type: string }) {
  const caller = await requireRole('super_admin')
  const supabase = await createServerSupabaseClient()
  const { data: company, error } = await supabase.from('companies').insert(data).select('id').single()
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'New company added', target: data.name, icon: 'Building2', tone: 'blue' })
  revalidatePath('/companies')
  return company
}

export async function updateCompany(id: string, data: { name?: string; type?: string; status?: string }) {
  const caller = await requireRole('super_admin')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('companies').update(data).eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: data.status ? `Company ${data.status.toLowerCase()}` : 'Company updated', target: data.name ?? id, icon: 'Building2', tone: data.status === 'Suspended' ? 'red' : 'gray' })
  revalidatePath('/companies')
}
