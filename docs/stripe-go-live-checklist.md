# Stripe Go-Live Checklist (SEC-129)

Status: **code complete & tested, not yet provisioned.** The whole billing stack
shipped in commit `06182eb`. What remains is Stripe Dashboard setup, env vars, and
applying migration `014`. No code needs writing.

Do Phase 1–2 in **test mode** to validate end-to-end locally, then Phase 3 for prod.

## Env vars the code reads

| Var | Used by | Notes |
|-----|---------|-------|
| `STRIPE_SECRET_KEY` | `lib/billing/stripe.ts` | Unset ⇒ billing silently no-ops |
| `STRIPE_WEBHOOK_SECRET` | `api/webhooks/stripe/route.ts` | **Differs per env** (CLI vs endpoint) |
| `STRIPE_PRICE_STARTER` | `lib/billing/plans.ts` | Stripe Price id for Starter |
| `STRIPE_PRICE_PROFESSIONAL` | `lib/billing/plans.ts` | Stripe Price id for Professional |
| `NEXT_PUBLIC_SITE_URL` | `lib/site-url.ts` | Origin for checkout/portal redirects; fallback `https://primex-security-build.vercel.app` |

Tiers (`lib/billing/plans.ts`): Starter **A$399/mo**, Professional **A$1,499/mo**,
Enterprise = contact-sales (no price).

---

## Phase 1 — Stripe Dashboard (TEST mode)

Toggle **Test mode** ON first.

- [ ] **Create products/prices** — Products → Add product:
  - Starter → recurring **A$399 / month**, currency **AUD**
  - Professional → recurring **A$1,499 / month**, currency **AUD**
  - ⚠️ **Do NOT set a trial on the Price** — the 14-day trial is applied in code
    (`billing.ts` → `trial_period_days: 14`). Setting both double-counts.
  - Copy each `price_...` id.
- [ ] **Enable Customer Portal** — Settings → Billing → Customer portal → activate.
  Required or `createPortalSession()` throws.
- [ ] **Enable payment methods** — Settings → Payment methods (Cards, etc.). Code
  omits `payment_method_types`, so it uses whatever the Dashboard enables.
- [ ] **Copy Secret key** — Developers → API keys → `sk_test_...`.

## Phase 2 — Local env + test the flow

- [ ] Add to `primex/.env.local`:
  ```bash
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_PRICE_STARTER=price_...
  STRIPE_PRICE_PROFESSIONAL=price_...
  STRIPE_WEBHOOK_SECRET=          # filled by `stripe listen` below
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```
- [ ] **Apply migration 014** to the DB you're testing against (see Migration section).
- [ ] **Forward webhooks** (Stripe CLI):
  ```bash
  stripe login
  stripe listen --forward-to localhost:3000/api/webhooks/stripe
  ```
  Copy the `whsec_...` it prints → `STRIPE_WEBHOOK_SECRET`, restart `npm run dev`.
- [ ] **Exercise it:**
  1. Log in as `jordan@primexsecurity.com.au` (super_admin) or
     `claire@apexretail.com.au` (company_manager) → Settings → Billing & plans.
  2. Subscribe to Starter, pay with test card `4242 4242 4242 4242`, any future
     expiry/CVC.
  3. Verify: redirected to `/settings?billing=success`, trial banner shows, a row
     appears in `subscriptions` (`status=trialing`), events logged in `billing_events`.
  4. Click **Manage billing** → portal opens, returns to `/settings?billing=portal`.

## Phase 3 — Production

- [ ] **Repeat Phase 1 in LIVE mode** (test-mode objects don't carry over): recreate
  both prices, activate portal, enable payment methods. Grab live `sk_live_...` +
  live price ids.
- [ ] **Create live webhook endpoint** — Developers → Webhooks → Add endpoint:
  - URL: `https://<domain>/api/webhooks/stripe`
  - Events (the 6 the handler acts on):
    `checkout.session.completed`, `customer.subscription.created`,
    `customer.subscription.updated`, `customer.subscription.deleted`,
    `invoice.payment_succeeded`, `invoice.payment_failed`
  - Copy the endpoint's **Signing secret** (`whsec_...`).
- [ ] **Set Vercel env vars** (Production scope): `STRIPE_SECRET_KEY=sk_live_...`,
  `STRIPE_WEBHOOK_SECRET=whsec_...` (the endpoint's, NOT the CLI's),
  `STRIPE_PRICE_STARTER`/`STRIPE_PRICE_PROFESSIONAL` (live ids),
  `NEXT_PUBLIC_SITE_URL=https://<domain>`.
- [ ] **Apply migrations to prod** (see below) and **redeploy** so env vars take effect.
- [ ] **Smoke-test** one subscription (real or via a Stripe [test clock]) and confirm
  the webhook shows `200` in the Dashboard.

---

## Migration gap (checked 2026-07-09)

The remote Supabase project (`yolalpykdguctbusbgbe`, used by the Vercel deploy) is
behind. As of the last deploy-state check, **migrations `008`–`015` were never pushed
to remote** — it's still at `007`.

- Migration `014` (subscriptions + billing_events) is the one billing needs.
- **Dependency check (static): clean.** `014` only references objects from `001`
  (`companies`, `get_user_role()`, `get_user_company()`, `update_updated_at()`), so
  `008`–`015` apply cleanly in numeric order on top of the remote's current `001`–`007`.
- `010`, `013`, `014`, `015` are idempotent (IF [NOT] EXISTS / DROP POLICY IF EXISTS / GRANT).
- ⚠️ `013` is also a **security fix** (per-site client isolation, SEC-147) — worth
  pushing the whole batch, not just `014`.
- `015` re-grants API-role table privileges idempotently (SEC-154). Needed because the
  grant fix in the already-applied `007` won't re-run on remote; `015` catches it up.

Apply (from a machine with the Supabase CLI + login + DB password — **this dev machine
has none**):
```bash
cd primex
supabase link --project-ref yolalpykdguctbusbgbe   # if not linked
supabase db push                                    # applies 008–015 in order
```

Seed accounts (`testpass123`) only exist where `supabase db reset` ran, so the deployed
DB may still lack the guard logins — see the `deploy-state-2026-07` note for how to
create individual accounts in Studio.
