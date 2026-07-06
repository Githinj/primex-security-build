'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole, requireActiveCompany } from '@/lib/auth/require-role'
import { logActivity } from './activity'
import { inviteUser } from './auth'

export async function createSite(data: {
  company_id: string
  name: string
  type: string
  address: string
  risk?: string
  client_name?: string
  client_email?: string
}): Promise<{ inviteError: string | null }> {
  const caller = await requireRole('super_admin', 'company_manager')
  await requireActiveCompany(caller)
  const supabase = await createServerSupabaseClient()

  // Separate the optional business-client fields — they are not columns on `sites`.
  const { client_name, client_email, ...siteData } = data
  const { error } = await supabase.from('sites').insert(siteData)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Site created', target: siteData.name, icon: 'MapPin', tone: 'blue' })

  // Provision the business client for the portal, if details were provided.
  // The site is already created, so an invite failure is surfaced (not fatal) —
  // the caller can retry the invite from the Team page.
  let inviteError: string | null = null
  if (client_email?.trim() && client_name?.trim()) {
    try {
      await inviteUser({
        email: client_email.trim(),
        full_name: client_name.trim(),
        role: 'client',
        company_id: siteData.company_id,
      })
    } catch (e) {
      inviteError = e instanceof Error ? e.message : 'Failed to send the client invite.'
    }
  }

  revalidatePath('/sites')
  return { inviteError }
}

export async function updateSite(
  id: string,
  data: { name: string; type: string; address: string; risk: string },
) {
  const caller = await requireRole('super_admin', 'company_manager')
  await requireActiveCompany(caller)
  const supabase = await createServerSupabaseClient()
  // RLS (sites_access) already restricts company_manager to their own company's
  // rows and lets super_admin edit any. We never touch company_id here, so a
  // manager can't move a site to another company.
  const { error } = await supabase
    .from('sites')
    .update({ name: data.name, type: data.type, address: data.address, risk: data.risk })
    .eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Site updated', target: data.name, icon: 'MapPin', tone: 'gray' })
  revalidatePath('/sites')
  revalidatePath(`/sites/${id}`)
  revalidatePath('/manager')
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
