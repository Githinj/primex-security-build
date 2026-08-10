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
- `/api/auth/test-login` exists alongside it for automated login; `/api/auth/forgot-password` handles reset requests.
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

- 19 migration files in `supabase/migrations/` define the full schema (001 initial, 002 AI detection, 003 streaming, 004 transactional functions, 005 recording retention cron, 006 dispatcher profile RLS fix, 007 notification preferences, 008 profile self-service — timezone/avatar columns, avatars bucket, email-sync trigger, 009 report period_start/period_end range, 010 incident_updates — guard on-scene notes/photo evidence + incident-evidence bucket, 011 company contact/plan fields, 012 incidents.guard_stage, 013 per-site client scoping — client_sites mapping + get_client_site_ids() + re-scoped client RLS, 014 subscriptions + billing_events for Stripe billing, 015 catch-up API-role table grants — re-applies grants for 007/010/013/014 tables on already-migrated DBs, 016 push_subscriptions for web push, 017 cameras.source_url — RTSP pull-ingest source, 018 partial unique index on cameras.stream_id — one camera per stream, releases duplicate claims first, 019 unique index on recordings.file_url — the vodReady idempotency key, de-duplicates existing rows first)
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

### Billing (Stripe, SEC-129)

- Per-company subscriptions. `lib/billing/stripe.ts` — env-gated client: unset `STRIPE_SECRET_KEY` makes billing a graceful no-op (`isBillingConfigured()`), the same pattern as the email/presign layers. `apiVersion` is intentionally omitted (SDK pins its own)
- `lib/billing/plans.ts` — `PLAN_TIERS` is the single source of truth for tiers (`starter` / `professional` / `enterprise`). Display fields are client-safe; Stripe Price ids resolve lazily from env vars (`priceIdForTier`, reverse `tierForPriceId` for the webhook)
- `lib/data/actions/billing.ts` — `createCheckoutSession()` (14-day trial) and `createPortalSession()` server actions; both use the service-role client to manage `subscriptions` rows
- Webhook: `app/api/webhooks/stripe/route.ts` — service-role writes (RLS-bypass) sync Stripe state into `subscriptions`; `billing_events.stripe_event_id UNIQUE` is the idempotency key (duplicate delivery fails the insert and is skipped), mirroring the antmedia `stream_events` pattern
- `subscriptions` is authoritative subscription state; `companies.plan` (migration 011) is only an admin label, not touched by billing
- UI lives in the Settings page; env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`

### Scheduled Work

- `GET /api/cron/reconcile-cameras` every 15 minutes (SEC-180) — the webhook is `cameras.status`'s only other writer and webhooks are at-most-once, so a lost delivery used to strand a camera at the wrong status forever. Compares the AMS broadcast list against the DB and corrects disagreements, logging each as a `status_reconciled` stream event. Node runtime (service-role writes), gated on `CRON_SECRET` with a constant-time compare and **fails closed when it is unset**. Leaves `Maintenance` cameras alone, and writes nothing at all when AMS is unreachable — marking the fleet Offline on a network blip would manufacture the outage it exists to detect. Decision logic is pure in `lib/streaming/reconcile.ts`
- `vercel.json` declares one other cron: `GET /api/cron/keep-alive` daily at 06:00 UTC. It pings Supabase `/auth/v1/health` purely to keep a free-tier project from being paused for inactivity — it is an edge-runtime route and intentionally returns 200 with a `status` field rather than failing loudly
- Recording retention runs inside Postgres via pg_cron (migration 005), not Vercel

### SEO (public pages)

- Per-route `metadata` / `generateMetadata` on public pages (landing, `(auth)` routes). `app/robots.ts` + `app/sitemap.ts` derive allow/disallow from the protected prefixes; `SITE_URL` comes from `lib/site-url.ts`
- Protected app areas are `disallow`ed in robots and excluded from the sitemap; `/reset-password` stays crawlable but carries a `noindex` meta

### AI Detection Layer

- Python worker in `ai_worker/` — runs independently, posts events to `supabase/functions/ai-event-ingest/` edge function
- Detection types: `motion_afterhours`, `person_lingering`, `concealment_behavior`, `door_event`, `vehicle_detection`
- Config tables: `camera_ai_config`, `site_business_hours`, `ai_worker_config`
- **Deployed separately from Vercel** — Docker on a DO droplet. `ai_worker/Dockerfile` + `docker-compose.yml`; full runbook in `docs/ai-worker-deploy.md` (root `docs/`). Inference is serialized through one model and one queue, so the throughput ceiling is `snapshot_interval_s ÷ inference_latency` cameras — watch `inference_queue_depth` on `/health`
- `/health` (port `HEALTH_PORT`, default 8080) returns 503 when starting, when the camera roster is stale, or when every camera is failing; 200 otherwise

### Camera Streaming

- Ant Media WebRTC primary (`@antmedia/webrtc_adaptor`), HLS fallback (`hls.js`)
- Components: `components/streaming/` (CameraPlayer, RecordingTimeline, RecordingPlayer)
- Pure logic lives in `lib/streaming/`, all colocated-tested: `webhook-events` (hook → effect mapping, body parsing, vodReady row), `webhook-auth` (secret verification + the `listenerHookURL` we hand AMS), `source-url` (SSRF classification), `ice-servers` (STUN/TURN), `hls-token` (token propagation + stream identity), `reconcile` (status correction), `rest-jwt` (the AMS REST token)
- **The REST JWT format is implemented twice** — `lib/streaming/rest-jwt.ts` and `ai_worker/antmedia_jwt.py` — because the Python worker calls the same API with the same secret. `fixtures/antmedia-rest-jwt.json` pins one (secret, exp) → token pair and **both** test suites assert it (SEC-188). If that test fails, find which side drifted; do not recompute the fixture. Drift breaks Enterprise auth with a 403 that looks exactly like the IP-allowlist problem in the deploy notes
- **`recording_enabled` is honoured via `PUT .../recording/{true|false}`**, not the Broadcast payload's `mp4Enabled` (SEC-189). That integer is tri-state and one value means "defer to the app setting"; which one could not be confirmed, so writing it risked storing "use the default" while meaning "off". Both provisioning paths apply the column, `setCameraRecording()` changes it, and the camera detail page has the toggle
- **Deleting a camera releases its broadcast** (`releaseBroadcast()`, SEC-186). The stream binding is read *before* the row goes and the broadcast is torn down *after* it, so a broadcast is never stopped for a camera that then fails to delete. Failure is reported, not thrown — the remove modal says the stream was left behind
- **Player specifics**: the connection effect is keyed on stream identity only (`withoutStreamToken(hlsUrl)`), never on the token, or an Enterprise token refresh tears down a healthy stream every ~55 min (SEC-191). hls.js needs `xhrSetup` to carry the token onto segment requests — relative URI resolution drops the query string and AMS 403s every `.ts` while the manifest loads fine (SEC-183). Native Safari HLS has no such hook and is a known gap. ICE servers ride on the `StreamToken` because TURN credentials are minted per request (SEC-184)
- Webhook: `app/api/webhooks/antmedia/` handles stream lifecycle + recording events. **AMS posts `application/x-www-form-urlencoded`, not JSON** — `parseHookBody()` accepts both and the route reads the body as text (SEC-202); a corollary is that every value arrives as a string, which is why `count()` in `webhook-events.ts` coerces numeric strings. The hook is only ever called if `listenerHookURL` is set on the broadcast, so `createBroadcast()` / `createStreamSource()` set it from `listenerHookUrl()` and PUT it onto an existing broadcast on 409 — re-running provisioning is the repair path for a camera created before this. Auth lives in `lib/streaming/webhook-auth.ts` (SEC-187): constant-time compare, fails closed when `ANTMEDIA_WEBHOOK_SECRET` is unset, optional `ANTMEDIA_WEBHOOK_ALLOWED_IPS` second factor, one uniform 401 for every failure. **The secret travels in the query string on purpose** — an AMS listener hook is a bare `listenerHookURL` with no custom headers and no signing, so the hook URL *is* the credential and an HMAC-over-body scheme like the Stripe webhook's is not achievable without a proxy in front of AMS
- Recordings stored in DO Spaces, timeline scrubber with 1h/6h/12h/24h presets
- **`stream_id` is super_admin-only and unique** (SEC-176). `getStreamToken()` mints a play token for whatever value sits in the camera row, so letting a `company_manager` set it meant they could point their own camera at another tenant's stream and watch that feed — RLS scopes which *row* you may write, not what you may put in it. Two layers: `assertMayAssignStreamId()` (`lib/auth/stream-id-guard.ts`, called by `createCamera`/`updateCamera`, colocated tests) and migration 018's partial unique index. Both camera modals hide the whole Streaming section from non-super_admins
- **`stream_url` / `source_url` are not on the `Camera` type** (SEC-177). `source_url` embeds the camera's RTSP credentials, and `getCameras()` rows are serialized into client components on `/cameras`, `/dispatcher`, `/portal` and `/sites/[id]` — anything on that interface reaches the browser of every role that can see the camera. `lib/data/cameras.ts` selects an explicit `CAMERA_COLUMNS` list, never `*`; read the two ingest fields via `getCameraStreamConfig()` (super_admin-gated, returns `CameraStreamConfig`)
- **Two ingest modes** (`lib/data/actions/streaming.ts`, both super_admin-only, keyed on `stream_id` so playback/webhooks are identical):
  - **RTMP push** — `createBroadcast()` creates a `type: 'liveStream'` broadcast and returns an ingest URL carrying a **publish token** (SEC-178). AMS enforces token control per-type, so play tokens do nothing for ingest; without one, anyone who learned a stream ID could publish arbitrary video into a monitored camera. On Enterprise this **fails closed** — no token, no URL. The token is returned once and never stored: `cameras.stream_url` keeps only the tokenless endpoint, and re-running the action is the rotation path
  - **RTSP pull** — `createStreamSource()` creates a `type: 'streamSource'` broadcast with `streamUrl` set to the camera's RTSP URL; Ant Media connects *out* and republishes it. The RTSP URL is stored in `cameras.source_url` (migration 017, distinct from `stream_url`) for restart/rotation; `stopStreamSource()` halts the pull without clearing it. AMS must be network-routable to the camera (LAN cameras need AMS on-net or a tunnel)

### Env Vars

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTMEDIA_URL`, `ANTMEDIA_APP`, `ANTMEDIA_WS_URL`, `ANTMEDIA_WEBHOOK_SECRET`
  - **Prod runs Ant Media Enterprise Edition** → `ANTMEDIA_APP=WebRTCAppEE` and URLs go over SSL (`https://…:5443`, `wss://…:5443/WebRTCAppEE/websocket`). The app is served over `https`, so AMS **must** be `https`/`wss` or the browser blocks it as mixed content — live video won't play otherwise. Code default is `LiveApp` (Community/local Docker on `:5080`)
- `ANTMEDIA_RTMP_URL` — the endpoint cameras publish *into*. Separate from `ANTMEDIA_URL` because ingest runs on its own port and scheme. Unset falls back to `rtmp://<ANTMEDIA_URL host>/<app>`, which is fine for local Docker but sends the publish token and the video in the clear — **an `rtmps://` value is what you want in prod**. ⚠️ **Do not assume port 443**: probed 2026-08-10, the prod server has *no* RTMPS listener — `:1935` completes an RTMP handshake, `:443` answers `HTTP/1.1 400 Bad Request` over TLS. A TCP-open check passes against that web listener, so it is not sufficient evidence; check for an RTMP handshake (`0x03`). Setting an unlistened `rtmps://` port silently breaks ingest (SEC-194)
- `ANTMEDIA_PUBLISH_TOKEN_TTL_DAYS` — lifetime of the publish token in the ingest URL (default 365)
- `ANTMEDIA_API_KEY` — the EE **HS256 signing secret** (AMS `jwtSecretKey`), *not* a token. `signRestJwt()` in `lib/streaming/rest-jwt.ts` mints a fresh 60-second JWT per request (header `{alg:HS256,typ:JWT}`, payload `{exp}` only) and sends the raw compact token in `Authorization` with **no `Bearer ` prefix`**. Sending the secret verbatim returns 403 "Invalid App JWT Token". Required in prod: it also switches `getStreamToken()` from tokenless URLs to real per-stream play tokens. Unset on Community Edition. The Python worker signs identically (`ai_worker/antmedia_jwt.py::sign_rest_jwt`) and reads the **same** `ANTMEDIA_API_KEY` — the shared golden fixture keeps the two in step. Note: prod REST may additionally be gated by IP allowlist — see the Ant Media REST IP allowlist memory
- `DO_SPACES_RECORDINGS_BUCKET`, `DO_SPACES_ENDPOINT` — ⚠️ `primex-recordings`, the name repeated across this repo's specs and `.env.example`, **does not exist in any DO region** (probed 2026-08-10). A bucket named `primex` exists in `sgp1`. Confirm in the DO console rather than copying from docs (SEC-194)
- `ANTMEDIA_WEBHOOK_ALLOWED_IPS`, `ANTMEDIA_WEBHOOK_URL` — optional. IP allowlist for the webhook (second factor behind the capability URL, SEC-187) and an override for the hook endpoint handed to AMS at provisioning time
- `ANTMEDIA_SOURCE_ALLOWED_CIDRS` — optional. Narrows which private addresses an RTSP pull source may resolve to (SEC-193). Loopback/link-local/multicast are refused unconditionally; private ranges are allowed by default because tunnelled site cameras genuinely live there
- `ANTMEDIA_STUN_URLS`, `ANTMEDIA_TURN_URLS`, `ANTMEDIA_TURN_SECRET` (or `ANTMEDIA_TURN_USERNAME`/`ANTMEDIA_TURN_CREDENTIAL`) — WebRTC ICE (SEC-184). Server-side only: the app mints short-lived coturn credentials per request, so the secret never reaches the browser. Unset leaves the adaptor on its own default and behaves as before
- `CRON_SECRET` — Vercel Cron's bearer token. The reconcile job **fails closed** without it
- `DO_SPACES_KEY`, `DO_SPACES_SECRET`, `DO_SPACES_REGION` — presign private-bucket reads. Optional for recordings (without them the stored public URL is served as-is), but **required** for AI detection frames: the worker writes those `ACL=private`, so the alert snapshot 403s unless the app can sign a GET. Signing lives in `lib/storage/presign.ts` (hand-rolled SigV4, no AWS SDK)
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
