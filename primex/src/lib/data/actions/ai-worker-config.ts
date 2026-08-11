'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { validateAiWorkerConfig, type AiWorkerConfigInput } from '@/lib/ai-worker-config'
import type { AiWorkerConfig } from '@/lib/types'

/**
 * The AI worker's tuning knobs (SEC-169). One singleton row, `id = 1`.
 *
 * Reads are defensive in the same spirit as `getNotificationPreferences`:
 * a missing row or a pre-002 database returns null and the Settings tab renders
 * an explanatory empty state rather than failing the whole page.
 */
export async function getAiWorkerConfig(): Promise<AiWorkerConfig | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('ai_worker_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) return null
    return data as AiWorkerConfig
  } catch {
    return null
  }
}

/**
 * Update the singleton.
 *
 * `requireRole('super_admin')` is the real gate — RLS on the table is
 * super_admin-only too, but this row is global rather than tenant-scoped, so a
 * company_manager writing it would retune every company's detection at once.
 * That is the one thing worth failing loudly about, hence the explicit check
 * rather than leaning on RLS to silently return zero rows.
 *
 * Validation runs server-side even though the form validates too: the form is
 * a convenience, the action is the boundary. `validateAiWorkerConfig` also
 * returns only known keys, so a crafted payload cannot reach other columns.
 */
export async function updateAiWorkerConfig(
  input: AiWorkerConfigInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireRole('super_admin')

  let clean: AiWorkerConfigInput
  try {
    clean = validateAiWorkerConfig(input)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Those values are not valid.' }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('ai_worker_config').update(clean).eq('id', 1)

  if (error) {
    return { ok: false, error: 'Could not save. Please try again.' }
  }

  revalidatePath('/settings')
  return { ok: true }
}
