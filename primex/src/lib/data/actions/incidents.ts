'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { logActivity } from './activity'

export async function createIncident(data: { site_id: string; alert_id: string; title: string; severity: string; notes?: string }) {
  const caller = await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').insert(data)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Incident created', target: data.title, icon: 'ClipboardList', tone: 'amber' })
  revalidatePath('/incidents')
}

export async function updateIncident(id: string, data: Record<string, unknown>) {
  const caller = await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').update(data).eq('id', id)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Incident updated', target: id, icon: 'ClipboardList', tone: 'amber' })
  revalidatePath('/incidents')
}

export async function assignGuard(incidentId: string, guardId: string) {
  const caller = await requireRole('super_admin', 'dispatcher')
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('incidents').update({ guard_id: guardId, status: 'Dispatched' }).eq('id', incidentId)
  if (error) throw error
  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'Guard assigned', target: incidentId, icon: 'Radio', tone: 'amber' })
  revalidatePath('/incidents')
}

export async function updateIncidentStatus(id: string, status: string) {
  const caller = await requireRole('super_admin', 'dispatcher', 'guard', 'company_manager')
  const supabase = await createServerSupabaseClient()

  if (status === 'Resolved') {
    const { error } = await supabase.rpc('resolve_incident', {
      p_incident_id: id,
      p_status: status,
    })
    if (error) throw error
  } else {
    const { error } = await supabase.from('incidents').update({ status }).eq('id', id)
    if (error) throw error
  }

  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: `Incident ${status.toLowerCase()}`, target: id, icon: status === 'Resolved' ? 'CheckCircle' : 'ClipboardList', tone: status === 'Resolved' ? 'green' : 'amber' })
  revalidatePath('/guard')
  revalidatePath('/incidents')
}

/**
 * Upload an on-scene photo to the incident-evidence bucket and return its URL.
 * The evidence row is created separately via addIncidentUpdate. Access is
 * validated by reading the incident under RLS first — a guard only sees
 * incidents assigned to them, so they can't attach to someone else's.
 */
export async function uploadIncidentPhoto(
  formData: FormData,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const incidentId = formData.get('incidentId')
    const file = formData.get('file')
    if (typeof incidentId !== 'string' || !incidentId) return { success: false, error: 'Missing incident.' }
    if (!(file instanceof File) || file.size === 0) return { success: false, error: 'No file provided.' }
    if (!file.type.startsWith('image/')) return { success: false, error: 'File must be an image.' }
    if (file.size > 5 * 1024 * 1024) return { success: false, error: 'Image must be under 5MB.' }

    await requireRole('guard', 'dispatcher', 'super_admin')
    const supabase = await createServerSupabaseClient()
    const { data: incident } = await supabase.from('incidents').select('id').eq('id', incidentId).single()
    if (!incident) return { success: false, error: 'Incident not found.' }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${incidentId}/${crypto.randomUUID()}.${ext}`
    const admin = createAdminSupabaseClient()
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error: upErr } = await admin.storage
      .from('incident-evidence')
      .upload(path, bytes, { contentType: file.type, upsert: false })
    if (upErr) return { success: false, error: upErr.message }

    const { data: pub } = admin.storage.from('incident-evidence').getPublicUrl(path)
    return { success: true, url: pub.publicUrl }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to upload photo.' }
  }
}

/** Append a note and/or photo to an incident's on-scene log. */
export async function addIncidentUpdate(input: {
  incidentId: string
  note?: string
  photoUrl?: string
  status?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const note = (input.note ?? '').trim()
    if (!note && !input.photoUrl) return { success: false, error: 'Add a note or photo first.' }

    const caller = await requireRole('guard', 'dispatcher', 'super_admin')
    const supabase = await createServerSupabaseClient()
    // Insert relies on RLS: the guard policy only permits rows for their own
    // assigned incidents, authored as themselves.
    const { error } = await supabase.from('incident_updates').insert({
      incident_id: input.incidentId,
      author_id: caller.userId,
      author_name: caller.fullName,
      note: note || null,
      photo_url: input.photoUrl ?? null,
      status: input.status ?? null,
    })
    if (error) return { success: false, error: error.message }

    logActivity({ actorId: caller.userId, actorName: caller.fullName, action: 'On-scene note added', target: input.incidentId, icon: 'ClipboardList', tone: 'blue' })
    revalidatePath('/guard')
    revalidatePath('/incidents')
    revalidatePath(`/incidents/${input.incidentId}`)
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to save note.' }
  }
}
