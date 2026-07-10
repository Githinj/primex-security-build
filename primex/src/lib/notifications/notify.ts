import 'server-only'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { sendEmail } from './email'
import { sendPush, isPushConfigured, type PushPayload } from './push'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://primex-security-build.vercel.app'

// Fan out web push to a company's users for `eventKey`, honoring each user's
// `push` preference (missing row = enabled, opt-out model). Dead subscriptions
// (404/410 from the push service) are pruned. No-op when VAPID isn't configured.
async function deliverPush(
  companyId: string,
  roles: string[],
  eventKey: string,
  payload: PushPayload,
): Promise<void> {
  if (!isPushConfigured()) return
  const admin = createAdminSupabaseClient()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'Active')
    .in('role', roles)
  const ids = (profiles ?? []).map((p: { id: string }) => p.id)
  if (ids.length === 0) return

  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('user_id, push')
    .eq('event_key', eventKey)
    .in('user_id', ids)
  const optedOut = new Set(
    (prefs ?? []).filter((r: { push: boolean }) => r.push === false).map((r: { user_id: string }) => r.user_id),
  )
  const targetIds = ids.filter((id: string) => !optedOut.has(id))
  if (targetIds.length === 0) return

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', targetIds)
  if (!subs || subs.length === 0) return

  const results = await Promise.all(subs.map((s: { endpoint: string; p256dh: string; auth: string }) => sendPush(s, payload)))
  const gone = subs
    .filter((_: unknown, i: number) => !results[i].ok && (results[i] as { gone?: boolean }).gone)
    .map((s: { endpoint: string }) => s.endpoint)
  if (gone.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', gone)
  }
}

interface Recipient {
  id: string
  email: string
  full_name: string
}

// Resolve active users in a company for the given roles, honoring each user's
// email preference for `eventKey`. Missing preference row = enabled (opt-out model).
// Uses the service-role client so it can read across users (bypasses RLS).
async function recipientsForCompany(
  companyId: string,
  roles: string[],
  eventKey: string,
): Promise<Recipient[]> {
  const admin = createAdminSupabaseClient()

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('company_id', companyId)
    .eq('status', 'Active')
    .in('role', roles)

  const candidates = (profiles ?? []).filter((p: { email?: string }) => Boolean(p.email))
  if (candidates.length === 0) return []

  const ids = candidates.map((p: { id: string }) => p.id)
  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('user_id, email')
    .eq('event_key', eventKey)
    .in('user_id', ids)

  const disabled = new Set(
    (prefs ?? []).filter((r: { email: boolean }) => r.email === false).map((r: { user_id: string }) => r.user_id),
  )

  return candidates
    .filter((p: { id: string }) => !disabled.has(p.id))
    .map((p: { id: string; email: string; full_name: string }) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
    }))
}

function layout(title: string, bodyHtml: string, cta: { label: string; href: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#111a2e;border-radius:12px 12px 0 0;padding:20px 24px;">
      <span style="color:#fff;font-weight:700;font-size:16px;letter-spacing:.5px;">PRIMEX SECURITY</span>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#0f172a;">${title}</h1>
      ${bodyHtml}
      <a href="${cta.href}" style="display:inline-block;margin-top:20px;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;">${cta.label}</a>
      <p style="margin-top:24px;color:#94a3b8;font-size:12px;">You are receiving this because notifications are enabled for your Primex account. Manage preferences in Settings.</p>
    </div>
  </div></body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

/**
 * Send "New critical alert" notifications to the affected company's managers and
 * clients. Self-contained: all errors are caught and logged so notification
 * failures never break alert creation.
 */
export async function notifyCriticalAlert(params: {
  siteId: string
  title: string
  severity: string
  description?: string
}): Promise<void> {
  try {
    if (params.severity !== 'Critical') return

    const admin = createAdminSupabaseClient()
    const { data: site } = await admin
      .from('sites')
      .select('id, name, company_id')
      .eq('id', params.siteId)
      .single()
    if (!site?.company_id) return

    const recipients = await recipientsForCompany(site.company_id, ['company_manager', 'client'], 'critical_alert')
    if (recipients.length === 0) return

    const subject = `🚨 Critical alert: ${params.title}`
    const body = `
      <p style="margin:0 0 8px;color:#334155;font-size:14px;">A <strong style="color:#dc2626;">critical</strong> alert was raised at <strong>${escapeHtml(site.name)}</strong>.</p>
      <p style="margin:0;color:#334155;font-size:14px;"><strong>${escapeHtml(params.title)}</strong></p>
      ${params.description ? `<p style="margin:8px 0 0;color:#64748b;font-size:13px;">${escapeHtml(params.description)}</p>` : ''}`
    const html = layout('Critical alert', body, { label: 'Open in Primex', href: `${APP_URL}/alerts` })

    await Promise.all(recipients.map((r) => sendEmail({ to: r.email, subject, html })))

    // Web push to the same audience (honors the per-user `push` preference).
    await deliverPush(site.company_id, ['company_manager', 'client'], 'critical_alert', {
      title: `🚨 Critical alert: ${params.title}`,
      body: params.description
        ? `${site.name} — ${params.description}`
        : `A critical alert was raised at ${site.name}.`,
      url: `${APP_URL}/alerts`,
      tag: 'critical_alert',
    })
  } catch (e) {
    console.error('[notifications] notifyCriticalAlert failed:', e)
  }
}
