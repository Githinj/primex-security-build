# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo Structure

The Next.js application lives in `primex/` — **run all commands from that directory**. See `primex/CLAUDE.md` for full architecture, commands, and conventions.

Top-level files:
- `Primex-Build-Plan.md` — original project specification (historical, stack has since changed to Next.js + Supabase)
- `Primex-Mockup (1).jsx` — original standalone UI mockup (historical reference, not wired into the app)
- `docs/superpowers/` — design specs and implementation plans
- `docs/go-live-checklist.md` — consolidated deploy checklist (migrations, every env var, provisioning); `docs/stripe-go-live-checklist.md` covers billing specifically

Two traps:
- There is a `supabase/` directory at the git root, but it holds only Supabase CLI scratch state (`.branches/`, `.temp/`). **The real migrations, seed, and edge functions are in `primex/supabase/`** — run all `supabase` CLI commands from `primex/`.
- Likewise `docs/` exists at both levels; the specs and checklists above are the root ones.
