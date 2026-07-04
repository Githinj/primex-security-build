import 'server-only'
import { Resend } from 'resend'

// Resend client is created only when configured. When RESEND_API_KEY is absent
// (e.g. before the key is provisioned in Vercel), sends become logged no-ops so
// nothing in the app breaks.
const apiKey = process.env.RESEND_API_KEY
const FROM = process.env.NOTIFICATIONS_FROM_EMAIL || 'Primex Security <alerts@primexsecurity.com.au>'

const resend = apiKey ? new Resend(apiKey) : null

export interface EmailMessage {
  to: string
  subject: string
  html: string
}

export interface SendResult {
  sent: boolean
  error?: string
}

export function isEmailConfigured(): boolean {
  return resend !== null
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  if (!resend) {
    console.warn(`[notifications] RESEND_API_KEY not set — skipping email "${msg.subject}" to ${msg.to}`)
    return { sent: false, error: 'RESEND_API_KEY not configured' }
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    })
    if (error) return { sent: false, error: typeof error === 'string' ? error : JSON.stringify(error) }
    return { sent: true }
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : 'send failed' }
  }
}
