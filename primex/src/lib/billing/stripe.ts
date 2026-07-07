import 'server-only'
import Stripe from 'stripe'

// Env-gated Stripe client. When STRIPE_SECRET_KEY is unset (e.g. before keys are
// provisioned in Vercel), billing becomes a graceful no-op — the same pattern as
// the Resend email layer (src/lib/notifications/email.ts) and DO Spaces presign
// (src/lib/storage/presign.ts). Never expose this client to the browser.
const secretKey = process.env.STRIPE_SECRET_KEY

// apiVersion is intentionally omitted: the installed SDK pins the API version it
// supports, and passing a newer version string would fail the SDK's type check.
export const stripe = secretKey ? new Stripe(secretKey) : null

export function isBillingConfigured(): boolean {
  return stripe !== null
}
