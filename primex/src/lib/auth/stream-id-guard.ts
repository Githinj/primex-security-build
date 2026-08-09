/**
 * Who may bind a camera to an Ant Media stream (SEC-176).
 *
 * `cameras.stream_id` is the key the whole streaming path resolves on:
 * `getStreamToken()` mints a play token for whatever value sits in the row, and
 * the antmedia webhook looks the camera up by it. RLS lets a company_manager
 * write their own camera rows, so without this check they could point one at
 * another tenant's stream_id and watch that tenant's live feed — RLS scopes
 * which row you may write, not what you may put in it.
 *
 * Migration 018's partial unique index is the database-level backstop; this is
 * the check that produces a comprehensible error. Lives outside the `'use
 * server'` action file because that file may only export async functions, and
 * this rule is worth testing directly.
 */
export function assertMayAssignStreamId(
  caller: { role: string },
  data: { stream_id?: string | null },
): void {
  if ('stream_id' in data && caller.role !== 'super_admin') {
    throw new Error('Only a super admin can assign a camera stream ID')
  }
}
