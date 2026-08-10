'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
import { normalizeZones, type AiZoneInput } from '@/lib/ai-zones'
import { logActivity } from './activity'

export async function toggleCameraAi(cameraId: string, enabled: boolean) {
  const caller = await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('camera_ai_config')
    .upsert({ camera_id: cameraId, enabled }, { onConflict: 'camera_id' })
  if (error) throw error

  logActivity({ actorId: caller.userId, actorName: caller.fullName, action: enabled ? 'AI detection enabled' : 'AI detection disabled', target: cameraId, icon: 'Camera', tone: enabled ? 'blue' : 'gray' })
  revalidatePath(`/cameras/${cameraId}`)
}

/**
 * Replace a camera's detection zones.
 *
 * Re-validated here rather than trusting the editor: the Python worker reads
 * this JSON straight out of Postgres and indexes `zone["coords"]["x1"]` without
 * guarding, so a malformed entry raises inside the camera task instead of
 * surfacing to anyone. Upsert preserves `enabled` — the row may not exist yet
 * for a camera that has never had AI switched on.
 */
export async function updateCameraZones(cameraId: string, zones: AiZoneInput[]) {
  const caller = await requireRole('super_admin', 'company_manager')

  const normalized = normalizeZones(zones)

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('camera_ai_config')
    .upsert({ camera_id: cameraId, zones: normalized }, { onConflict: 'camera_id' })
  if (error) throw error

  logActivity({
    actorId: caller.userId,
    actorName: caller.fullName,
    action:
      normalized.length === 0
        ? 'Detection zones cleared'
        : `Detection zones updated (${normalized.length})`,
    target: cameraId,
    icon: 'Camera',
    tone: 'blue',
  })
  revalidatePath(`/cameras/${cameraId}`)
}
