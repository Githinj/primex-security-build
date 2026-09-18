# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo Structure

The Next.js application lives in `primex/` — **run all commands from that directory**. See `primex/CLAUDE.md` for full architecture, commands, and conventions.

Top-level files:
- `Primex-Build-Plan.md` — original project specification (historical, stack has since changed to Next.js + Supabase)
- `Primex-Mockup (1).jsx` — original standalone UI mockup (historical reference, not wired into the app)
- `docs/superpowers/` — design specs and implementation plans
- `docs/roadmap.md` — **what to do next and in what order** across the streaming, AI-detection and go-live tracks, with the critical path called out. Sequencing only; it links out rather than restating detail
- `docs/go-live-checklist.md` — consolidated deploy checklist (migrations, every env var, provisioning); `docs/stripe-go-live-checklist.md` covers billing specifically
- `docs/streaming-architecture.md` — 🚨 **the authority on how video reaches the app.** Ingest is moving from RTSP pull to outbound **SRT push** (decided 2026-09-15); the code and every other doc are still behind it. Read this before touching `primex/src/lib/data/actions/streaming.ts`, the camera/stream schema, the AMS webhook, or provisioning
- `docs/ai-worker-deploy.md` — runbook for the Python detection worker (Docker on a DO droplet, deployed separately from Vercel)
- `docs/streaming-capacity.md` — measured WebRTC viewer ceiling and the origin/edge plan (SEC-192)
- `.github/workflows/deploy.yml` — the whole CI pipeline: a push to `master` curls a Vercel deploy hook. No build, lint, typecheck or test gate, so run those locally

Two traps:
- There is a `supabase/` directory at the git root, but it holds only Supabase CLI scratch state (`.branches/`, `.temp/`). **The real migrations, seed, and edge functions are in `primex/supabase/`** — run all `supabase` CLI commands from `primex/`.
- Likewise `docs/` exists at both levels; the specs and checklists above are the root ones.
