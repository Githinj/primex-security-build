# Primex — Roadmap

What to do next, and in what order. **Last verified: 2026-09-18.**

## What this document is, and is not

This file owns **sequencing**: which workstreams block which, and what the critical path
is. It deliberately holds no per-item detail and no issue status, because those already
have homes and a third copy would drift:

| For | Read |
|---|---|
| Per-issue state and what remains on each | the `Open tracker` table in [`go-live-checklist.md`](./go-live-checklist.md) |
| How to perform any individual step | [`go-live-checklist.md`](./go-live-checklist.md) |
| Why ingest is push and what the target design is | [`streaming-architecture.md`](./streaming-architecture.md) |
| The measured viewer ceiling | [`streaming-capacity.md`](./streaming-capacity.md) |
| How to deploy the detection worker | [`ai-worker-deploy.md`](./ai-worker-deploy.md) |

If this file and one of those disagree, **those are right and this is stale** — fix the
date line above along with whatever drifted.

Each item is tagged by the access it needs, not by who does it:
`[infra]` = console, server or dashboard access · `[code]` = a change in this repo.

---

## The critical path

**The detection worker has nothing to watch.**

The pilot camera stopped publishing on 2026-08-12, and the instability before that was the
VPN tunnel that the push architecture removes. Stand the worker up today and you get a
healthy process, a green `/health`, and zero detections — indistinguishable from a broken
one.

So: **streaming first-light gates *validation* of the AI layer, not its deployment.** The
two can be built and deployed in parallel. They can only be *proven* in order. Anything
that claims the AI layer works before a camera is publishing reliably is measuring
nothing.

That is why Track A leads and Track B trails it, even though Track B is closer to done.

---

## Track 0 — clear the decks

Small, and everything downstream is cleaner once these land.

1. `[code]` Merge the two open PRs: **#32** (AMS licence status) and **#34** (pins
   `verify_jwt = false` for the worker-facing edge functions).
2. `[infra]` Deploy the second edge function:
   `npx supabase functions deploy camera-heartbeat --no-verify-jwt`.
   The flag is not optional — see the `verify_jwt` note in the checklist for why its
   absence produces a 401 that looks like a wrong secret.
3. `[infra]` Set `AI_WORKER_SECRET` as a Supabase secret, and put the identical value in
   `ai_worker/.env` when the worker is built. Generate it somewhere it will not be
   captured in a transcript or shell history. Until this exists, both edge functions
   refuse every request by design.

---

## Track A — streaming: pull to push

The long pole. Design and rationale live in
[`streaming-architecture.md`](./streaming-architecture.md); this is only the order.

1. `[infra]` **Confirm the AMS Enterprise licence actually responds.** It was renewed, but
   nothing has exercised an Enterprise-only path since. SRT ingest, token control and REST
   JWT auth all depend on it, and a lapse surfaces only as a 403.
2. `[infra]` **Upgrade the droplet.** 2 vCPU / 4 GB is below Ant Media's stated minimum
   before adding SRT ingest. Re-enabling server-side ABR also waits on this.
3. `[infra]` **Enable SRT ingest** (UDP 4200) and settle the scheme: streamId format,
   per-site AES passphrase, publish token.
4. `[infra]` **Build the pusher.** A companion Raspberry Pi running distro ffmpeg under
   systemd is preferred over a static ffmpeg binary on the gateway — it is the option that
   stays maintainable at 100+ sites.
5. `[code]` **App-side provisioning**: mint SRT credentials per site, persist them,
   generate the pusher config bundle support burns onto a gateway, and retire
   `createStreamSource()` from both camera modals. Note the deterministic streamId scheme
   must route *through* `assertMayAssignStreamId()`, not around it.
6. `[infra]` **Re-point the pilot and watch it hold.** If the diagnosis is right, the
   90–180s publish flap simply does not recur. That non-event is the proof.

---

## Track B — AI detection to first light

Everything here is built and tested already; what remains is deployment. See
[`ai-worker-deploy.md`](./ai-worker-deploy.md).

1. `[infra]` Worker on **its own** 4 vCPU / 8 GB droplet. Never the AMS box — that one is
   already under-spec and would be serving ingest, egress and snapshot polling at once.
2. `[infra]` Add the worker's IP to the **Ant Media REST allowlist**, or every snapshot
   fetch 403s while the worker reports itself healthy.
3. `[infra]` Fill `ai_worker/.env`: the same `AI_WORKER_SECRET` as Track 0, the same
   `ANTMEDIA_API_KEY` as the app, and DO Spaces keys — without those last ones every alert
   arrives with a broken snapshot image.
4. `[infra]` Run the runbook's first-light check — **after** Track A step 6, per the
   critical path above.
5. `[code]` Sizing is arithmetic, not guesswork: inference is serialized, so the ceiling is
   `poll_interval ÷ inference_latency` (~20 cameras at defaults). Revisit using
   `inference_queue_depth` on `/health` once real cameras exist, not before.

---

## Track C — runs in parallel

Independent of A and B; none of it blocks anything else.

1. `[infra]` **Secrets rotation.** Note `ANTMEDIA_API_KEY` has two consumers — the app and
   the worker — so both rotate in one window or the worker fails silently.
2. `[code]` **SEC-203 offline alerting.** Detection already exists; the gap is the alert
   when a site stops publishing and does not return. Blocked on a number — see below.
3. `[code]` **Fix the `240+ sites` copy** in `primex/src/app/landing-client.tsx`. There is
   one pilot camera.
4. `[infra]` **TVT DVR compatibility test.** Validates the "any RTSP DVR works" premise of
   the push design against a second brand.

---

## Decisions needed

These are blocked on a choice, not on effort. Each is cheap once answered.

| Decision | Needed for | Note |
|---|---|---|
| **N** — seconds before a non-republishing site raises an alert | Track C.2 | ~120s is a sane start: above SRT's ~800 ms buffer and a supervisor respawn, below a human noticing |
| What replaces **`240+ sites`** | Track C.3 | The truthful number today is 1 |
| Whether the **TVT DVR test** runs before or after the pilot cuts over | Track C.4 | Before de-risks the premise; after keeps the cutover simple |
