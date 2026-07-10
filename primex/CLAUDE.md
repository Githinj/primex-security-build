# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# All commands run from the primex/ directory
npm run dev          # Start dev server (next dev)
npm run build        # Production build
npm run lint         # ESLint (flat config, eslint.config.mjs)
npm start            # Start production server

# Unit tests (Vitest, node env — pure logic in src/**/*.test.ts)
npm test                   # Run the Vitest suite once
npm run test:watch         # Watch mode
npx vitest run src/lib/utils.test.ts   # Run a single test file

# E2E tests (Playwright, requires dev server running)
npm run test:e2e           # Run all E2E tests (headless)
npm run test:e2e:headed    # Run E2E tests with browser visible
npx playwright test e2e/auth.spec.ts  # Run a single test file

# Supabase (requires Supabase CLI)
supabase start       # Local Supabase stack
supabase db reset    # Reset DB and re-run migrations + seed

# AI worker (Python, separate runtime)
cd ai_worker && pip install -r requirements.txt && python main.py
```

Unit tests are Vitest (node env), colocated as `src/**/*.test.ts` — pure logic only (`vitest.config.ts` aliases `@/` and stubs `server-only`). E2E tests live in `e2e/` (Playwright, Chromium only, serial execution). The AI worker has unit tests in `ai_worker/tests/`.

## Architecture

### Next.js 15 with App Router

- **Auth proxy**: `src/middleware.ts` (NOT middleware.ts) — Supabase session refresh + route protection + role-based redirects
- **Route groups**: `(app)` for authenticated routes, `(auth)` for login / reset-password / request-access
- **Role-based dashboards**: Each role has its own route and UI:
  - `super_admin` → `/dashboard` (home) + shared top-level routes (`/alerts`, `/incidents`, `/sites`, `/cameras`, `/guards`, `/companies`, `/reports`, `/audit`, `/settings`, `/team`)
  - `dispatcher` → `/dispatcher` (queue, incidents, dispatch board, guards, activity)
  - `guard` → `/guard` (incident status flow, no sidebar)
  - `company_manager` → `/manager` (sites, cameras, alerts, incidents, team, reports)
  - `client` → `/portal` (alerts, incidents, reports, help)
- **Params/cookies are async**: `await params`, `await cookies()` — Next.js 15 requirement

### Data Layer

- **Queries**: `lib/data/*.ts` — read-only server functions (e.g., `getAlerts()`, `getSites()`)
- **Mutations**: `lib/data/actions/*.ts` — `"use server"` actions (e.g., `updateIncidentStatus()`, `inviteUser()`)
- **Supabase clients**: `lib/supabase/client.ts` (browser), `server.ts` (server components/actions), `admin.ts` (service-role for admin ops)
- **Types**: `lib/types/index.ts` — all domain types and enums

### Supabase & RLS

- 14 migration files in `supabase/migrations/` define the full schema (001 initial, 002 AI detection, 003 streaming, 004 transactional functions, 005 recording retention cron, 006 dispatcher profile RLS fix, 007 notification preferences, 008 profile self-service — timezone/avatar columns, avatars bucket, email-sync trigger, 009 report period_start/period_end range, 010 incident_updates — guard on-scene notes/photo evidence + incident-evidence bucket, 011 company contact/plan fields, 012 incidents.guard_stage, 013 per-site client scoping — client_sites mapping + get_client_site_ids() + re-scoped client RLS, 014 subscriptions + billing_events for Stripe billing)
- Migrations are written idempotent (`IF [NOT] EXISTS` / `DROP POLICY IF EXISTS`) so they can be re-applied safely
- RLS uses CASE-based policies to avoid recursion; `get_user_role()` reads from `auth.users` metadata
- `handle_new_user` trigger auto-creates profiles on signup
- Seed data: `supabase/seed.sql` — 9 test users (password: `testpass123`), key accounts: `jordan@primexsecurity.com.au` (super_admin), `claire@apexretail.com.au` (company_manager), `samira@` (dispatcher), `marcus@` (guard), `brett@nexuslogistics.com.au` (client)

### Tailwind CSS v4

Custom design tokens defined via `@theme inline` in `globals.css`. Use the project palette:
- `p-blue`, `p-red`, `p-amber`, `p-green`, `p-gray` (each has `-soft` variant)
- `navy`, `navy-darker`, `navy-tile` (dark backgrounds)
- `ink`, `ink-2`, `ink-3`, `ink-4` (text hierarchy)
- `bg`, `surface`, `surface-subtle`, `border`, `border-strong`

### UI Components

`components/ui/` — custom design system primitives (Button, Card, Modal, DataTable, StatCard, Pill, etc.) exported via barrel `index.ts`. No shadcn/ui or component library.

### Context Providers

- `ProfileProvider` — current user profile, available in all `(app)` routes
- `ScopeProvider` — company scope filtering for super_admin

### Email Notifications

- `lib/notifications/email.ts` — thin `resend` wrapper. Sends are **logged no-ops** when `RESEND_API_KEY` is unset, so the app never breaks without it (`isEmailConfigured()` gates this)
- `lib/notifications/notify.ts` — event senders (e.g. `notifyCriticalAlert()`). Uses the service-role client to resolve recipients across users, honoring `notification_preferences` (missing row = enabled, opt-out model). All errors are caught/logged so notification failures never break the triggering mutation
- Preferences: `notification_preferences` table (migration 007), managed via `lib/data/actions/notification-preferences.ts` and the Settings page
- Env: `RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`

### Billing (Stripe, SEC-129)

- Per-company subscriptions. `lib/billing/stripe.ts` — env-gated client: unset `STRIPE_SECRET_KEY` makes billing a graceful no-op (`isBillingConfigured()`), the same pattern as the email/presign layers. `apiVersion` is intentionally omitted (SDK pins its own)
- `lib/billing/plans.ts` — `PLAN_TIERS` is the single source of truth for tiers (`starter` / `professional` / `enterprise`). Display fields are client-safe; Stripe Price ids resolve lazily from env vars (`priceIdForTier`, reverse `tierForPriceId` for the webhook)
- `lib/data/actions/billing.ts` — `createCheckoutSession()` (14-day trial) and `createPortalSession()` server actions; both use the service-role client to manage `subscriptions` rows
- Webhook: `app/api/webhooks/stripe/route.ts` — service-role writes (RLS-bypass) sync Stripe state into `subscriptions`; `billing_events.stripe_event_id UNIQUE` is the idempotency key (duplicate delivery fails the insert and is skipped), mirroring the antmedia `stream_events` pattern
- `subscriptions` is authoritative subscription state; `companies.plan` (migration 011) is only an admin label, not touched by billing
- UI lives in the Settings page; env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`

### SEO (public pages)

- Per-route `metadata` / `generateMetadata` on public pages (landing, `(auth)` routes). `app/robots.ts` + `app/sitemap.ts` derive allow/disallow from the protected prefixes; `SITE_URL` comes from `lib/site-url.ts`
- Protected app areas are `disallow`ed in robots and excluded from the sitemap; `/reset-password` stays crawlable but carries a `noindex` meta

### AI Detection Layer

- Python worker in `ai_worker/` — runs independently, posts events to `supabase/functions/ai-event-ingest/` edge function
- Detection types: `motion_afterhours`, `person_lingering`, `concealment_behavior`, `door_event`, `vehicle_detection`
- Config tables: `camera_ai_config`, `site_business_hours`, `ai_worker_config`

### Camera Streaming

- Ant Media WebRTC primary (`@antmedia/webrtc_adaptor`), HLS fallback (`hls.js`)
- Components: `components/streaming/` (CameraPlayer, RecordingTimeline, RecordingPlayer)
- Webhook: `app/api/webhooks/antmedia/` handles stream lifecycle + recording events
- Recordings stored in DO Spaces, timeline scrubber with 1h/6h/12h/24h presets

### Env Vars

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTMEDIA_URL`, `ANTMEDIA_APP` (default: `LiveApp`), `ANTMEDIA_WS_URL`, `ANTMEDIA_WEBHOOK_SECRET`
- `ANTMEDIA_API_KEY` (optional — only needed for Enterprise Edition)
- `DO_SPACES_RECORDINGS_BUCKET`, `DO_SPACES_ENDPOINT`
- `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION` (optional — only needed to presign recording playback for a private recordings bucket; without them the stored public URL is served as-is). Signing lives in `lib/storage/presign.ts` (hand-rolled SigV4, no AWS SDK)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL` (optional — billing no-ops when unset)

### Key Conventions

- Path alias: `@/*` maps to `./src/*`
- tsconfig excludes `supabase/functions` (Deno runtime) and `ai_worker` (Python)
- Icons: `lucide-react` exclusively
- Drag-and-drop: `@dnd-kit` (dispatch board)
- PDF generation: `jspdf` + `jspdf-autotable` (server actions)
- Multi-table writes use Postgres functions (`004_transactional_functions.sql`) instead of sequential inserts
- Server actions gate access with `requireRole(...roles)` (`lib/auth/require-role.ts`), which returns the caller's `{ companyId, ... }` — RLS is the backstop, not the only check
- `primex/AGENTS.md` contains Next.js agent rules — read `node_modules/next/dist/docs/` before using unfamiliar Next.js APIs

### Repo Layout

The git root is above `primex/`. Top-level structure:
- `primex/` — the Next.js app (run all commands from here)
- `docs/superpowers/` — specs and implementation plans
- `Primex-Build-Plan.md` — original project build plan
