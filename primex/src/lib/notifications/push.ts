import 'server-only'
import webpush from 'web-push'

// web-push is configured only when a VAPID keypair is present. When it's absent
// (e.g. before keys are provisioned in Vercel), sends become logged no-ops — the
// same graceful-degradation pattern as the email layer (email.ts).
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:alerts@primexsecurity.com.au'

let configured = false
if (PUBLIC_KEY && PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
    configured = true
  } catch (e) {
    console.warn('[notifications] invalid VAPID config — web push disabled:', e)
  }
}

export function isPushConfigured(): boolean {
  return configured
}

export interface PushSubscriptionRecord {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

// Returns 'gone' when the push service reports the subscription is no longer
// valid (404/410) so the caller can prune the dead row.
export type PushSendResult = { ok: true } | { ok: false; gone: boolean; error: string }

export async function sendPush(
  sub: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!configured) {
    console.warn(`[notifications] VAPID not set — skipping push "${payload.title}"`)
    return { ok: false, gone: false, error: 'VAPID not configured' }
  }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    )
    return { ok: true }
  } catch (e) {
    const statusCode = (e as { statusCode?: number })?.statusCode
    const gone = statusCode === 404 || statusCode === 410
    return { ok: false, gone, error: e instanceof Error ? e.message : 'push failed' }
  }
}
