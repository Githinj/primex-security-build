'use server'

import { getActivity } from '@/lib/data/activity'
import { requireRole } from '@/lib/auth/require-role'
import type { ActivityItem } from '@/lib/types'

// Full audit log for CSV export (super_admin only). Bounded to a large cap so a
// runaway table can't blow up the response; the audit page is super_admin-scoped.
export async function exportAuditLog(): Promise<ActivityItem[]> {
  await requireRole('super_admin')
  return getActivity(10000)
}
