# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# All commands run from the primex/ directory
npm run dev          # Start dev server (next dev)
npm run build        # Production build
npm run lint         # ESLint (flat config, eslint.config.mjs)
npm start            # Start production server

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

E2E tests live in `e2e/` (Playwright, Chromium only, serial execution). The AI worker has unit tests in `ai_worker/tests/`.

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

- 9 migration files in `supabase/migrations/` define the full schema (001 initial, 002 AI detection, 003 streaming, 004 transactional functions, 005 recording retention cron, 006 dispatcher profile RLS fix, 007 notification preferences, 008 profile self-service — timezone/avatar columns, avatars bucket, email-sync trigger, 009 report period_start/period_end range)
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

### Key Conventions

- Path alias: `@/*` maps to `./src/*`
- tsconfig excludes `supabase/functions` (Deno runtime) and `ai_worker` (Python)
- Icons: `lucide-react` exclusively
- Drag-and-drop: `@dnd-kit` (dispatch board)
- PDF generation: `jspdf` + `jspdf-autotable` (server actions)
- Multi-table writes use Postgres functions (`004_transactional_functions.sql`) instead of sequential inserts
- `primex/AGENTS.md` contains Next.js agent rules — read `node_modules/next/dist/docs/` before using unfamiliar Next.js APIs

### Repo Layout

The git root is above `primex/`. Top-level structure:
- `primex/` — the Next.js app (run all commands from here)
- `docs/superpowers/` — specs and implementation plans
- `Primex-Build-Plan.md` — original project build plan
