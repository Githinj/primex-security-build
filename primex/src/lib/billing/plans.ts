import type { PlanTier } from '@/lib/types'

// Single source of truth for the subscription tiers. Display data (name/amount/
// features) is safe to import into client components; the Stripe Price id is
// resolved lazily from a private env var so it's only read server-side.
export interface PlanTierConfig {
  tier: PlanTier
  name: string
  /** AUD per month; null for contact-sales tiers. */
  amount: number | null
  /** Env var holding the Stripe Price id (self-serve tiers only). */
  priceEnvVar?: string
  contactSales?: boolean
  tagline: string
  features: string[]
}

export const PLAN_TIERS: PlanTierConfig[] = [
  {
    tier: 'starter',
    name: 'Starter',
    amount: 399,
    priceEnvVar: 'STRIPE_PRICE_STARTER',
    tagline: 'For single-location operators.',
    features: [
      'Up to 3 sites',
      'Up to 24 cameras',
      '5 team members',
      'Monthly PDF reports',
      'Email + push notifications',
    ],
  },
  {
    tier: 'professional',
    name: 'Professional',
    amount: 1499,
    priceEnvVar: 'STRIPE_PRICE_PROFESSIONAL',
    tagline: 'Growing multi-site operators.',
    features: [
      'Up to 25 sites',
      'Unlimited cameras',
      'Unlimited team members',
      'Real-time dispatch board',
      'API access',
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    amount: null,
    contactSales: true,
    tagline: 'Security firms & large estates.',
    features: [
      'Unlimited sites & cameras',
      'Dedicated success manager',
      'SSO + advanced auth',
      'Custom SLA',
    ],
  },
]

export function planTier(tier: PlanTier): PlanTierConfig | undefined {
  return PLAN_TIERS.find((p) => p.tier === tier)
}

// Server-only in practice (reads a private env var). Returns the Stripe Price id
// for a self-serve tier, or null if the tier isn't self-serve or isn't configured.
export function priceIdForTier(tier: PlanTier): string | null {
  const cfg = planTier(tier)
  if (!cfg?.priceEnvVar) return null
  return process.env[cfg.priceEnvVar] ?? null
}

// Reverse lookup used by the webhook to derive our tier from a Stripe Price id.
export function tierForPriceId(priceId: string | null | undefined): PlanTier | null {
  if (!priceId) return null
  for (const cfg of PLAN_TIERS) {
    if (cfg.priceEnvVar && process.env[cfg.priceEnvVar] === priceId) return cfg.tier
  }
  return null
}
