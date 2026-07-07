import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PLAN_TIERS, planTier, priceIdForTier, tierForPriceId } from './plans'

describe('plans', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env.STRIPE_PRICE_STARTER = 'price_starter_123'
    process.env.STRIPE_PRICE_PROFESSIONAL = 'price_pro_456'
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('exposes the three tiers', () => {
    expect(PLAN_TIERS.map((p) => p.tier)).toEqual(['starter', 'professional', 'enterprise'])
  })

  it('resolves a Price id for self-serve tiers', () => {
    expect(priceIdForTier('starter')).toBe('price_starter_123')
    expect(priceIdForTier('professional')).toBe('price_pro_456')
  })

  it('returns null for the contact-sales tier', () => {
    expect(priceIdForTier('enterprise')).toBeNull()
    expect(planTier('enterprise')?.contactSales).toBe(true)
  })

  it('returns null when the price env var is unset', () => {
    delete process.env.STRIPE_PRICE_STARTER
    expect(priceIdForTier('starter')).toBeNull()
  })

  it('reverse-maps a Price id back to its tier', () => {
    expect(tierForPriceId('price_starter_123')).toBe('starter')
    expect(tierForPriceId('price_pro_456')).toBe('professional')
  })

  it('returns null for unknown or empty Price ids', () => {
    expect(tierForPriceId('price_unknown')).toBeNull()
    expect(tierForPriceId(null)).toBeNull()
    expect(tierForPriceId(undefined)).toBeNull()
  })
})
