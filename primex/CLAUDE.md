# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

> This repo is developed on Windows (PowerShell is the primary shell). The command blocks below use POSIX/bash syntax — run them via the Bash tool, or translate to PowerShell equivalents.

```bash
# All commands run from the primex/ directory
npm run dev          # Start dev server (next dev)
npm run build        # Production build
npm run lint         # ESLint (flat config, eslint.config.mjs)
npm start            # Start production server
npx tsc --noEmit     # Typecheck — there is no npm script for this; faster than a full build

# Unit tests (Vitest, node env — pure logic in src/**/*.test.ts)
npm test                   # Run the Vitest suite once
npm run test:watch         # Watch mode
npx vitest run src/lib/utils.test.ts   # Run a single test file

# E2E tests (Playwright) — WARNING: globalSetup runs `supabase db reset`, wiping the local DB
npm run test:e2e           # Run all E2E tests (headless)
npm run test:e2e:headed    # Run E2E tests with browser visible
npx playwright test e2e/auth.spec.ts  # Run a single test file

# Supabase (requires Supabase CLI)
supabase start       # Local Supabase stack
supabase db reset    # Reset DB and re-run migrations + seed

# AI worker (Python, separate runtime)
cd ai_worker && pip install -r requirements.txt && python main.py
cd ai_worker && pytest             # Unit tests (behavior_tracker, cooldown)
```

Unit tests are Vitest (node env), colocated as `src/**/*.test.ts` — pure logic only (`vitest.config.ts` aliases `@/` and stubs `server-only`). The AI worker has unit tests in `ai_worker/tests/`.

E2E tests live in `e2e/` (Playwright, Chromium only, `workers: 1` + `fullyParallel: false` — they share one database, so they must stay serial). Before running them:
- `e2e/global-setup.ts` runs `npx supabase db reset` (up to 3 attempts) before the suite. **This destroys local DB state** and re-seeds from `supabase/seed.sql` — the specs assume exactly those seed rows.
- `e2e/helpers/auth.ts` `loginAs(page, role)` logs in through the real UI once per role and caches cookies to `e2e/.auth/<role>.json`, falling back to a fresh UI login when the cache is stale. Its `USERS` map duplicates the role→home-path mapping; keep it in sync with `getRoleHomePath()` (see Auth Flow below).
- `webServer` uses `reuseExistingServer: true`, so an already-running `npm run dev` is reused rather than a second one started.

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

### Auth Flow

Sign-in deliberately does **not** go through a server action. `POST /api/auth/login` (`app/api/auth/login/route.ts`) is the entry point, and the pieces fit together like this:

- The route accepts **both** JSON (from `fetch`) and form-encoded bodies (no-JS form post), and branches its response shape on `content-type` — JSON callers get JSON, form callers get a redirect. Change one branch, change the other.
- It creates its own `createServerClient` so the Supabase auth cookies are written onto the outgoing `NextResponse`. A server action can't reliably do this here.
- The client then **hard-navigates** (`window.location`) rather than using the router, so the middleware re-runs against the freshly-set cookies (SEC-165). A soft push lands the user back on `/login`.
- The email is `.trim()`ed, the password is not — leading/trailing spaces can be legitimate password characters (SEC-164).
- `lib/auth/role-redirect.ts` `getRoleHomePath(role)` is the single source of truth for role → landing path. It is consumed by this route and `src/middleware.ts`; `e2e/helpers/auth.ts` keeps its own copy. Adding a role means touching all three.
- `/api/auth/test-login` (`POST`) exists alongside it for mobile/manual debugging — disabled by default (404s unless `TEST_LOGIN_SECRET` is set) and requires that secret on the `x-test-login-secret` header even when enabled; `/api/auth/forgot-password` handles reset requests.
- Authorization inside the app is separate: server actions call `requireRole(...roles)` (see Key Conventions), while `src/middleware.ts` handles session refresh and coarse route protection.

### Data Layer

- **Queries**: `lib/data/*.ts` — read-only server functions (e.g., `getAlerts()`, `getSites()`)
- **Mutations**: `lib/data/actions/*.ts` — `"use server"` actions (e.g., `updateIncidentStatus()`, `inviteUser()`)
- **Supabase clients**: `lib/supabase/client.ts` (browser), `server.ts` (server components/actions), `admin.ts` (service-role for admin ops)
- **Types**: `lib/types/index.ts` — all domain types and enums
- **Pagination**: `lib/data/pagination.ts` — `applyPagination()` must be chained *after* `.order()`, and the query must `select('*', { count: 'exact' })` or the total comes back null. `toPaginatedResult()` wraps the response into `{ data, total, page, pageSize, totalPages }`. Colocated tests in `pagination.test.ts`

### Pure Domain Logic

- `lib/guard-lifecycle.ts` — the guard incident state machine (`assigned → accepted → enroute → arrived → resolved`), shared by the guard UI and tests. The `incident_status` enum can't distinguish Accepted/En Route/Arrived (all "In Progress"), so the finer stage is carried in `incidents.guard_stage` (migration 012); this module maps between the two. Colocated tests in `guard-lifecycle.test.ts`
- `lib/support.ts` — single source of truth for dispatch/support contact details, so the portal home and Get-help page never drift

### Supabase & RLS

- 17 migration files in `supabase/migrations/` define the full schema (001 initial, 002 AI detection, 003 streaming, 004 transactional functions, 005 recording retention cron, 006 dispatcher profile RLS fix, 007 notification preferences, 008 profile self-service — timezone/avatar columns, avatars bucket, email-sync trigger, 009 report period_start/period_end range, 010 incident_updates — guard on-scene notes/photo evidence + incident-evidence bucket, 011 company contact/plan fields, 012 incidents.guard_stage, 013 per-site client scoping — client_sites mapping + get_client_site_ids() + re-scoped client RLS, 014 subscriptions + billing_events for Stripe billing, 015 catch-up API-role table grants — re-applies grants for 007/010/013/014 tables on already-migrated DBs, 016 push_subscriptions for web push, 017 cameras.source_url — RTSP pull-ingest source)
- **Every migration that creates a public table MUST `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated, anon, service_role`** — this repo has no default-privilege auto-grant, so a missing grant silently breaks the table over PostgREST even with correct RLS (SEC-154, see migration 015). RLS scopes rows; GRANT makes the table reachable at all.
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

### Notifications (email + web push)

- `lib/notifications/email.ts` — thin `resend` wrapper. Sends are **logged no-ops** when `RESEND_API_KEY` is unset, so the app never breaks without it (`isEmailConfigured()` gates this)
- `lib/notifications/push.ts` — `web-push` wrapper, same graceful-degradation pattern: logged no-op unless a VAPID keypair is set (`isPushConfigured()`). `sendPush()` returns a `gone` flag on 404/410 so the caller can prune dead subscription rows
- `lib/notifications/notify.ts` — event senders (e.g. `notifyCriticalAlert()`). Uses the service-role client to resolve recipients across users, honoring `notification_preferences` (missing row = enabled, opt-out model), and fans out to both email and every stored push subscription. All errors are caught/logged so notification failures never break the triggering mutation
- Web push (SEC-148): `push_subscriptions` table (migration 016, one row per browser), client subscribe/unsubscribe in `lib/push/subscribe.ts` + `lib/data/actions/push-subscriptions.ts`, service worker + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on the client
- Preferences: `notification_preferences` table (migration 007), managed via `lib/data/actions/notification-preferences.ts` and the Settings page
- Env: `RESEND_API_KEY`, `NOTIFICATIONS_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`; for push `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (optional — push no-ops when unset)
- A third, separate delivery path: `lib/hooks/use-realtime-alerts.ts` subscribes to Supabase Realtime `postgres_changes` INSERTs on `alerts` directly from the browser, fires a `Notification` for AI-sourced alerts, and calls `router.refresh()` so the visible list updates live. This bypasses `notify.ts`/`notification_preferences` entirely — it's tied to having the app open, not an opt-in preference.

### Billing (Stripe, SEC-129)

- Per-company subscriptions. `lib/billing/stripe.ts` — env-gated client: unset `STRIPE_SECRET_KEY` makes billing a graceful no-op (`isBillingConfigured()`), the same pattern as the email/presign layers. `apiVersion` is intentionally omitted (SDK pins its own)
- `lib/billing/plans.ts` — `PLAN_TIERS` is the single source of truth for tiers (`starter` / `professional` / `enterprise`). Display fields are client-safe; Stripe Price ids resolve lazily from env vars (`priceIdForTier`, reverse `tierForPriceId` for the webhook)
- `lib/data/actions/billing.ts` — `createCheckoutSession()` (14-day trial) and `createPortalSession()` server actions; both use the service-role client to manage `subscriptions` rows
- Webhook: `app/api/webhooks/stripe/route.ts` — service-role writes (RLS-bypass) sync Stripe state into `subscriptions`; `billing_events.stripe_event_id UNIQUE` is the idempotency key (duplicate delivery fails the insert and is skipped), mirroring the antmedia `stream_events` pattern
- `subscriptions` is authoritative subscription state; `companies.plan` (migration 011) is only an admin label, not touched by billing
- UI lives in the Settings page; env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`

### Scheduled Work

- `vercel.json` declares one cron: `GET /api/cron/keep-alive` daily at 06:00 UTC. It pings Supabase `/auth/v1/health` purely to keep a free-tier project from being paused for inactivity — it is an edge-runtime route and intentionally returns 200 with a `status` field rather than failing loudly
- Recording retention runs inside Postgres via pg_cron (migration 005), not Vercel

### SEO (public pages)

- Per-route `metadata` / `generateMetadata` on public pages (landing, `(auth)` routes). `app/robots.ts` + `app/sitemap.ts` derive allow/disallow from the protected prefixes; `SITE_URL` comes from `lib/site-url.ts`
- Protected app areas are `disallow`ed in robots and excluded from the sitemap; `/reset-password` stays crawlable but carries a `noindex` meta

### AI Detection Layer

Python worker in `ai_worker/` (aiohttp app, separate runtime/deploy from Next.js). `main.py` starts a `Supervisor` on boot and exposes `GET /health` for the platform health check.

- **`Supervisor`** (`supervisor.py`) polls the `cameras`/`camera_ai_config`/`site_business_hours` tables every 30s (`SYNC_INTERVAL_S`) for online, AI-enabled cameras, then diffs against its running set: cancels `CameraTask`s for cameras no longer active, starts one for each newly active camera. One shared `Detector` (YOLOv8, `ultralytics`) and `CooldownRegistry` are reused across all camera tasks.
- **`CameraTask`** (`camera_task.py`) is a per-camera asyncio loop: fetch a snapshot → submit to the shared detector → run `BehaviorTracker.process()` → post any resulting events, then sleep `snapshot_interval_s`. Snapshot fetch has two strategies mirroring the front-end's Enterprise-vs-Community split (`src/lib/data/actions/streaming.ts`): Enterprise (`antmedia_secret` set) hits the REST snapshot API with a per-request signed JWT (`_sign_rest_jwt`, must stay byte-identical to `signAntmediaRestJwt()` on the TS side); Community pulls a frame off the HLS playlist via OpenCV (persistent capture, reopened on failure).
- **`Detector`** (`detector.py`) wraps one YOLO model behind an async queue so all camera tasks share a single GPU-bound inference worker instead of loading the model per-camera.
- **`BehaviorTracker`** (`behavior_tracker.py`) turns raw detections into the detection-type events: `motion_afterhours`, `person_lingering`, `concealment_behavior`, `door_event`, `vehicle_detection`.
- **`CooldownRegistry`** (`cooldown.py`) dedupes repeated firings of the same event type on the same camera within `cooldown_s`.
- **`EventPoster`** (`event_poster.py`) uploads the triggering frame to DO Spaces, then POSTs the event to the `ai-event-ingest` edge function with retry/backoff (`1s, 2s, 4s`); if all retries fail, the event is appended to `missed_events.jsonl` instead of being dropped. `replay_missed.py` re-sends that file's contents later.
- Worker config (`confidence_threshold`, `snapshot_interval_s`, `cooldown_s`, `dwell_threshold_s`, `door_open_threshold_s`) is a singleton row loaded at startup from `ai_worker_config` (`config.py`), not env vars.
- **Env vars are named differently from the Next app for the same underlying resources** — don't assume they're shared: `ai_worker/.env` uses `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` (Next uses `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) and `AI_WORKER_SECRET` (checked in `supabase/functions/ai-event-ingest`). It also writes frames to `DO_SPACES_BUCKET` — a separate bucket from the Next app's `DO_SPACES_RECORDINGS_BUCKET`.
- Tests: `ai_worker/tests/` (pytest, `pyproject.toml` sets `pythonpath = ["."]` so tests import worker modules directly).

### Camera Streaming

- Ant Media WebRTC primary (`@antmedia/webrtc_adaptor`), HLS fallback (`hls.js`)
- Components: `components/streaming/` (CameraPlayer, RecordingTimeline, RecordingPlayer)
- Webhook: `app/api/webhooks/antmedia/` handles stream lifecycle + recording events
- Recordings stored in DO Spaces, timeline scrubber with 1h/6h/12h/24h presets
- **Two ingest modes** (`lib/data/actions/streaming.ts`, both super_admin-only, keyed on `stream_id` so playback/webhooks are identical):
  - **RTMP push** — `createBroadcast()` creates a `type: 'liveStream'` broadcast and returns an `rtmp://` ingest URL the camera publishes *into* (stored in `cameras.stream_url`)
  - **RTSP pull** — `createStreamSource()` creates a `type: 'streamSource'` broadcast with `streamUrl` set to the camera's RTSP URL; Ant Media connects *out* and republishes it. The RTSP URL is stored in `cameras.source_url` (migration 017, distinct from `stream_url`) for restart/rotation; `stopStreamSource()` halts the pull without clearing it. AMS must be network-routable to the camera (LAN cameras need AMS on-net or a tunnel)

### Env Vars

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTMEDIA_URL`, `ANTMEDIA_APP`, `ANTMEDIA_WS_URL`, `ANTMEDIA_WEBHOOK_SECRET`
  - **Prod runs Ant Media Enterprise Edition** → `ANTMEDIA_APP=WebRTCAppEE` and URLs go over SSL (`https://…:5443`, `wss://…:5443/WebRTCAppEE/websocket`). The app is served over `https`, so AMS **must** be `https`/`wss` or the browser blocks it as mixed content — live video won't play otherwise. Code default is `LiveApp` (Community/local Docker on `:5080`)
- `ANTMEDIA_API_KEY` — the EE **HS256 signing secret** (AMS `jwtSecretKey`), *not* a token. `signAntmediaRestJwt()` in `streaming.ts` mints a fresh 60-second JWT per request (header `{alg:HS256,typ:JWT}`, payload `{exp}` only) and sends the raw compact token in `Authorization` with **no `Bearer ` prefix`**. Sending the secret verbatim returns 403 "Invalid App JWT Token". Required in prod: it also switches `getStreamToken()` from tokenless URLs to real per-stream play tokens. Unset on Community Edition. The Python worker signs identically (`ai_worker/camera_task.py::_sign_rest_jwt`) and reads the **same** `ANTMEDIA_API_KEY` — keep the two in step. Note: prod REST may additionally be gated by IP allowlist — see the Ant Media REST IP allowlist memory
- `DO_SPACES_RECORDINGS_BUCKET`, `DO_SPACES_ENDPOINT`
- `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION` (optional — only needed to presign recording playback for a private recordings bucket; without them the stored public URL is served as-is). Signing lives in `lib/storage/presign.ts` (hand-rolled SigV4, no AWS SDK)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL` (optional — billing no-ops when unset)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (optional — web push no-ops when unset)

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
