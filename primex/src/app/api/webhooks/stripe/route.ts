import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/billing/stripe'
import { tierForPriceId } from '@/lib/billing/plans'

// Stripe's Node SDK needs the Node runtime (not edge), and signature verification
// needs the raw request body.
export const runtime = 'nodejs'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

// Minimal shape we read off a Stripe Subscription. Typed loosely on purpose so we
// don't couple to the exact field locations of a specific Stripe API version
// (e.g. current_period_end has lived at both the subscription and item level).
type SubLike = {
  id: string
  status: string
  customer: string | { id: string }
  metadata?: Record<string, string>
  cancel_at_period_end?: boolean
  trial_end?: number | null
  current_period_end?: number | null
  items?: { data?: Array<{ price?: { id?: string }; current_period_end?: number | null }> }
}

type Admin = ReturnType<typeof createAdminSupabaseClient>

const toIso = (unixSeconds?: number | null): string | null =>
  unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null

const customerId = (c: SubLike['customer']): string | null =>
  typeof c === 'string' ? c : c?.id ?? null

// Resolve our company_id from the subscription metadata, falling back to the
// stripe_customer_id we stored when the checkout customer was created.
async function resolveCompanyId(admin: Admin, sub: SubLike): Promise<string | null> {
  if (sub.metadata?.company_id) return sub.metadata.company_id
  const cust = customerId(sub.customer)
  if (!cust) return null
  const { data } = await admin
    .from('subscriptions')
    .select('company_id')
    .eq('stripe_customer_id', cust)
    .maybeSingle()
  return data?.company_id ?? null
}

async function upsertFromSubscription(admin: Admin, sub: SubLike): Promise<void> {
  const companyId = await resolveCompanyId(admin, sub)
  if (!companyId) {
    console.warn(`[stripe] subscription ${sub.id} has no resolvable company_id — skipping`)
    return
  }

  const item = sub.items?.data?.[0]
  const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null

  await admin.from('subscriptions').upsert(
    {
      company_id: companyId,
      stripe_customer_id: customerId(sub.customer),
      stripe_subscription_id: sub.id,
      plan_tier: tierForPriceId(item?.price?.id),
      status: sub.status,
      current_period_end: toIso(periodEnd),
      trial_end: toIso(sub.trial_end),
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    { onConflict: 'company_id' }
  )
}

export async function POST(req: NextRequest) {
  // Nothing to verify or do when billing isn't configured — ack so Stripe (or a
  // stray caller) doesn't retry.
  if (!stripe || !WEBHOOK_SECRET) {
    return NextResponse.json({ received: true, skipped: 'billing not configured' })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'signature verification failed'
    console.warn(`[stripe] webhook signature verification failed: ${msg}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()

  // Idempotency: the unique stripe_event_id makes a replayed delivery a no-op.
  const { error: insertErr } = await admin.from('billing_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    payload: event as unknown as Record<string, unknown>,
  })
  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true })
    }
    // Log but continue — an audit-insert failure shouldn't drop the event.
    console.warn(`[stripe] billing_events insert failed: ${insertErr.message}`)
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertFromSubscription(admin, event.data.object as unknown as SubLike)
        break
      }
      case 'checkout.session.completed': {
        // Subscribe just completed — pull the full subscription for its status/period.
        const session = event.data.object as { subscription?: string | null }
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription)
          await upsertFromSubscription(admin, sub as unknown as SubLike)
        }
        break
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        // Refresh status (e.g. active | past_due) from the linked subscription.
        const invoice = event.data.object as { subscription?: string | null }
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription)
          await upsertFromSubscription(admin, sub as unknown as SubLike)
        }
        break
      }
      default:
        // Unhandled event types are acknowledged and ignored.
        break
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'handler error'
    console.error(`[stripe] error handling ${event.type}: ${msg}`)
    // Return 500 so Stripe retries a transient failure.
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
