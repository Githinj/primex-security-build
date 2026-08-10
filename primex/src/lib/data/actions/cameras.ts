'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole, requireActiveCompany } from '@/lib/auth/require-role'
// Only super_admin may bind a camera to a stream (SEC-176) — both camera modals
// hide the streaming fields from other roles, so reaching this throw means a
// hand-made call.
import { assertMayAssignStreamId } from '@/lib/auth/stream-id-guard'
import { releaseBroadcast } from './streaming'
import { logActivity } from './activity'

export async function createCamera(data: { site_id: string; name: string; location: string; status?: string; stream_id?: string | null }) {
  const caller = await requireRole('super_admin', 'company_manager')
  await requireActiveCompany(caller)
  assertMayAssignStreamId(caller, data)
  const supabase = await createServerSupabaseClient()
  const { data: inserted, error } = await supabase.from('cameras').insert(data).select('id').single()
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Camera added', target: data.name, icon: 'Camera', tone: 'blue' })
  revalidatePath('/cameras')
  return inserted.id as string
}

export async function updateCamera(id: string, data: { name?: string; location?: string; status?: string; stream_id?: string | null }) {
  // Aligns with create/delete: company_manager may edit cameras within their own
  // company (RLS on `cameras` scopes them to their sites); super_admin edits any.
  const caller = await requireRole('super_admin', 'company_manager')
  await requireActiveCompany(caller)
  assertMayAssignStreamId(caller, data)
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

  // Read the stream binding BEFORE the row goes: afterwards there is nothing left
  // that knows which Ant Media broadcast belonged to this camera, and the
  // broadcast keeps pulling from the customer's camera, recording into DO Spaces
  // and costing money with nothing in the app pointing at it (SEC-186).
  const { data: camera } = await supabase
    .from('cameras')
    .select('stream_id')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('cameras').delete().eq('id', id)
  if (error) throw error

  // After the delete, so a broadcast is never torn down for a camera that then
  // fails to delete. An orphaned row is recoverable; a camera whose feed we
  // stopped while it still exists is a silent outage.
  let released = true
  if (camera?.stream_id) {
    released = (await releaseBroadcast(camera.stream_id)).released
  }

  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Camera removed', target: id, icon: 'Camera', tone: 'red' })
  revalidatePath('/cameras')

  // The camera is gone either way; the caller decides whether to mention that
  // Ant Media still holds the broadcast and needs a manual sweep.
  return { released }
}
