'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'
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
