'use server'

import { requireRole } from '@/lib/auth/require-role'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/billing/stripe'
import { priceIdForTier } from '@/lib/billing/plans'
import { SITE_URL } from '@/lib/site-url'
import type { PlanTier } from '@/lib/types'

type Result = { success: boolean; error?: string; url?: string }

// Reuse the company's existing Stripe customer, or create one. Writes go through
// the service-role client (RLS-bypass) since subscriptions rows are managed by
// billing infra, not the user session. The webhook later fills the rest.
async function ensureCustomer(companyId: string): Promise<string> {
  const admin = createAdminSupabaseClient()

  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('company_id', companyId)
    .maybeSingle()
  if (existing?.stripe_customer_id) return existing.stripe_customer_id

  const { data: company } = await admin
    .from('companies')
    .select('name, contact_email')
    .eq('id', companyId)
    .maybeSingle()

  const customer = await stripe!.customers.create({
    name: company?.name ?? undefined,
    email: company?.contact_email ?? undefined,
    metadata: { company_id: companyId },
  })

  await admin
    .from('subscriptions')
    .upsert(
      { company_id: companyId, stripe_customer_id: customer.id },
      { onConflict: 'company_id' }
    )

  return customer.id
}

export async function createCheckoutSession(tier: PlanTier): Promise<Result> {
  if (!stripe) return { success: false, error: 'Billing is not configured.' }
  try {
    const caller = await requireRole('super_admin', 'company_manager')
    if (!caller.companyId) {
      return { success: false, error: 'No company is associated with your account.' }
    }

    const priceId = priceIdForTier(tier)
    if (!priceId) {
      return { success: false, error: `The ${tier} plan isn't available for self-serve checkout.` }
    }

    const customerId = await ensureCustomer(caller.companyId)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: caller.companyId,
      line_items: [{ price: priceId, quantity: 1 }],
      // No payment_method_types — let Stripe pick dynamically from Dashboard config.
      subscription_data: {
        trial_period_days: 14,
        metadata: { company_id: caller.companyId },
      },
      success_url: `${SITE_URL}/settings?billing=success`,
      cancel_url: `${SITE_URL}/settings?billing=cancelled`,
    })

    if (!session.url) return { success: false, error: 'Could not start checkout.' }
    return { success: true, url: session.url }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Checkout failed.' }
  }
}

export async function createPortalSession(): Promise<Result> {
  if (!stripe) return { success: false, error: 'Billing is not configured.' }
  try {
    const caller = await requireRole('super_admin', 'company_manager')
    if (!caller.companyId) {
      return { success: false, error: 'No company is associated with your account.' }
    }

    const admin = createAdminSupabaseClient()
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('company_id', caller.companyId)
      .maybeSingle()

    if (!sub?.stripe_customer_id) {
      return { success: false, error: 'No billing account yet — subscribe to a plan first.' }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${SITE_URL}/settings?billing=portal`,
    })
    return { success: true, url: session.url }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Could not open billing portal.' }
  }
}
