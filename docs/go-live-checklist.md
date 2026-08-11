# Primex — Consolidated Go-Live Checklist

One place for everything needed to take the platform live. Supersedes the
Stripe-only `docs/stripe-go-live-checklist.md` (still useful for Stripe detail).

**Snapshot (2026-08-11):** the provisioning backlog that dominated this document
has been worked through — site networking (SEC-197/198/199/200), the Vercel link
(SEC-196), env values (SEC-152/194), prod role accounts (SEC-195), the DO Spaces
lifecycle rule (SEC-94), the `vodReady` payload capture (SEC-182) and AI
auto-alerts (SEC-141) are all closed. Items below are marked `[x]` on that basis.

**The traps are kept, deliberately.** Each completed item retains the check that
found the problem, because these are the things that silently regress: a firmware
update reverts an MTU, a bucket policy gets re-created at the wrong window, an
AMS app setting resets. Re-run the verification, don't re-derive the trap.

Most integrations still degrade to a graceful no-op when their env is unset, so
an unset value makes a feature stay dark rather than break.

---

## 1. Database migrations

Local is at `022`. `021`/`022` add the pg_cron + pg_net camera-reconciliation
schedule; `020` adds the evidentiary hold.

```bash
cd primex
npx supabase migration list          # anything local-only is pending
npx supabase db push
```

- [ ] Confirm remote is at `022`. `migration list` is the only source of truth —
      this line has been wrong before.
- [ ] Seed data is **not** deployed by `db push`. Prod accounts were created
      individually (SEC-195), *not* by running `seed.sql` — that file inserts
      fixtures with fixed UUIDs into what is now a live tenant. Do not run it here.

Run `db push` from a machine with the Supabase CLI logged in (`supabase login`) and
the DB password — **from `primex/`**, not the repo root.

---

## 2. Environment variables (set in Vercel → Production)

Legend: 🔑 secret (never `NEXT_PUBLIC_`) · 🌐 public · ⚙️ required · 💤 optional (no-op if unset)

### Core — required
| Var | | Notes |
|-----|---|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | 🌐⚙️ | Remote Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 🌐⚙️ | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔑⚙️ | Service role — webhooks/admin writes |
| `NEXT_PUBLIC_SITE_URL` | 🌐⚙️ | **Prod domain** (SEC-152). Drives canonical URLs, robots, sitemap, OG image, **and Stripe redirect URLs** — wrong value = post-checkout bounce to /login |

### Streaming (Ant Media)
| Var | | Notes |
|-----|---|-------|
| `ANTMEDIA_URL` | ⚙️ | e.g. `http://host:5080` |
| `ANTMEDIA_APP` | ⚙️ | `LiveApp` (Community) / `WebRTCAppEE` (Enterprise) |
| `ANTMEDIA_WS_URL` | ⚙️ | WebRTC signalling ws URL |
| `ANTMEDIA_WEBHOOK_SECRET` | 🔑⚙️ | Shared secret for `/api/webhooks/antmedia` |
| `ANTMEDIA_API_KEY` | 🔑💤 | Enterprise only — HS256 **signing secret** (AMS `jwtSecretKey`), not a token; app signs a 60s JWT per REST call. Same value in `ai_worker` env (per-stream play/publish tokens + REST snapshot) |
| `ANTMEDIA_RTMP_URL` | ⚙️ | Ingest endpoint cameras publish into. Set to the RTMPS listener (SEC-194). Unset derives plaintext `rtmp://` from `ANTMEDIA_URL`, which puts the publish token and video on the wire in the clear (SEC-178). ⚠️ **Never assume a port — probe it.** On 2026-08-10 this server's `:443` was a web listener answering `HTTP/1.1 400 Bad Request` while only `:1935` completed a handshake. A TCP-open check passes against a web listener, so confirm the first handshake byte is `0x03`. An unlistened `rtmps://` port breaks ingest silently |
| `ANTMEDIA_PUBLISH_TOKEN_TTL_DAYS` | 💤 | Publish-token lifetime, default 365 |

### Recordings (DigitalOcean Spaces)
| Var | | Notes |
|-----|---|-------|
| `DO_SPACES_RECORDINGS_BUCKET` | ⚙️ | Bucket name, resolved under SEC-194. ⚠️ **`primex-recordings` is wrong** — that name is repeated throughout this repo's older specs and `.env.example`, and it exists in no DO region (probed across nine, 2026-08-10). Take the value from the DO console, never from a doc |
| `DO_SPACES_ENDPOINT` | ⚙️ | e.g. `https://sgp1.digitaloceanspaces.com` |
| `DO_SPACES_REGION` | 💤 | Presign region (default `sgp1`) |
| `DO_SPACES_KEY` / `DO_SPACES_SECRET` | 🔑 | Presigns private-bucket reads. Optional for recordings (only if that bucket is private) but **required** for AI detection frames — that bucket is private by design, so without these every alert snapshot 403s |

### Email (Resend) — 💤 logged no-op if unset
| Var | | |
|-----|---|--|
| `RESEND_API_KEY` | 🔑💤 | |
| `NOTIFICATIONS_FROM_EMAIL` | 💤 | Verified sender |

### Web push (VAPID) — 💤 logged no-op if unset (SEC-148)
| Var | | |
|-----|---|--|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 🌐💤 | Generate a **fresh** pair for prod: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | 🔑💤 | |
| `VAPID_SUBJECT` | 💤 | `mailto:alerts@…` |

### Billing (Stripe) — 💤 "not configured" no-op if unset (SEC-129)
| Var | | |
|-----|---|--|
| `STRIPE_SECRET_KEY` | 🔑💤 | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | 🔑💤 | The **live endpoint's** `whsec_…` (not the CLI one) |
| `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PROFESSIONAL` | 💤 | Live **AUD** price ids |

---

## 3. Third-party provisioning

### Stripe (billing) — see `docs/stripe-go-live-checklist.md` for detail
- [ ] Create the two prices in **LIVE** mode, in **AUD** (test prices are USD).
- [ ] Confirm the Stripe account entity/country supports AUD.
- [ ] Enable the **Customer Portal** (live).
- [ ] Enable payment methods (live).
- [ ] Create the **live webhook** → `https://<domain>/api/webhooks/stripe` with:
      `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
      `invoice.payment_succeeded/failed` → copy its signing secret.

### Web push (SEC-148)
- [ ] `npx web-push generate-vapid-keys` → set the three `VAPID_*` vars in Vercel.
- [ ] Redeploy; `/sw.js` is served from `public/`.

### Recordings retention (SEC-94 — done)
- [x] Object lifecycle expiry set on the DO Spaces recordings bucket (pairs with
      the DB retention cron from SEC-91).
- [ ] ⚠️ **Confirm the window against the evidentiary hold** — still open, and the
      one number on this page that can lose evidence (SEC-190).
      The DB keeps incident-linked footage for up to a year
      (`evidence_retention_days`, migration 020) and honours `recordings.hold_until`
      for footage requested by a client, insurer or police. **The bucket knows
      nothing about either.** If the lifecycle expires objects at 30 days while the
      DB holds the row for a year, the held row survives pointing at a **404** — it
      then proves footage existed rather than being the footage.
      Two consistent configurations; record which one is live:
      - bucket window matches `evidence_retention_days` (simple, costs storage), **or**
      - held objects are copied to a longer-retention prefix the lifecycle rule
        does not cover (cheaper — **no code does this yet**, so this option is only
        real once it is built).
      Deletions are logged to `recording_deletions`, so DB-side losses stay
      answerable; object-side losses are not.

### Ant Media / AI worker
- [ ] Point `ANTMEDIA_*` at the live server.
- [ ] **Enable token control for BOTH `play` and `publish`** on the AMS app. AMS
      enforces it per-type, so play-only leaves ingest wide open — anyone who
      learns a stream ID can publish into a monitored camera (SEC-178). With
      `ANTMEDIA_API_KEY` set, `createBroadcast()` fails closed rather than issuing
      an unsecured ingest URL, so this must be working before provisioning.
- [x] **RTMPS listener configured on AMS**, and `ANTMEDIA_RTMP_URL` set to it
      (SEC-194). Before this, ingest was plaintext and the publish token crossed
      the wire in the clear.
      **Re-probe after any AMS upgrade or port change** — this regressed once and
      the failure is silent. "Port is open" is NOT sufficient evidence: a TCP
      connect succeeds against a plain web listener too. On 2026-08-10 `:443`
      answered `HTTP/1.1 400 Bad Request` over TLS while only `:1935` completed a
      real handshake. **Confirm the first response byte of an RTMP handshake is
      `0x03`.** An unlistened `rtmps://` port breaks ingest with no error surfaced.
- [ ] Re-issue ingest URLs for any camera provisioned before this change — the old
      URLs carry no token, and the token is shown once at creation.
- [ ] **Verify the webhook actually arrives** (SEC-202 — still open). As of
      2026-08-10 it never had: `listenerHookURL` was `null` on all three live
      broadcasts and `stream_events` / `recordings` were empty, so camera status,
      drop telemetry and recordings were all inert in production. Until a delivery
      is observed, treat those three features as unproven in prod.
      - `createBroadcast()` / `createStreamSource()` now set `listenerHookURL`
        themselves, derived from `NEXT_PUBLIC_SITE_URL` (or `ANTMEDIA_WEBHOOK_URL`)
        plus `ANTMEDIA_WEBHOOK_SECRET`. **Both must be set before provisioning** —
        with no secret the hook is omitted rather than pointed at an endpoint that
        401s every delivery.
      - **Re-provision the cameras that already exist.** Create is a no-op on an
        existing broadcast; the actions now PUT the payload on 409, so re-running
        Connect from the camera detail page is the repair path.
      - Optionally set `settings.listenerHookURL` in the app's
        `WEB-INF/red5-web.properties` as a server-wide default.
      - Then confirm end to end: start a stream → a `stream_events` row appears.
        The `vodReady` payload was captured under SEC-182, so the field names are
        no longer guesswork — **record the observed `Content-Type` and field names
        on SEC-202** if they are not already there, since the route accepts both
        form-encoded and JSON and the parsing branch depends on which arrives.
- [x] **TURN server standing**, `ANTMEDIA_TURN_URLS` + `ANTMEDIA_TURN_SECRET` set
      (SEC-184). Run over **TLS on 443** so it survives firewalls that only allow
      HTTPS; `ANTMEDIA_TURN_SECRET` is coturn's `static-auth-secret`.
      **Keep the trap in mind when anyone reports "video works fine":** with no
      relay, viewers behind symmetric NAT or on networks blocking outbound UDP
      silently degrade to HLS at 10–30s latency. "Confirm the WebRTC pill" passes on
      an office network and fails at exactly the customer sites that matter, so a
      green check here is only meaningful if it was taken on a restrictive network.
- [x] **HLS fallback verified** under token control (SEC-183). hls.js carries the
      token onto segment requests via `xhrSetup` — relative URI resolution drops the
      query string otherwise and AMS 403s every `.ts` while the manifest loads fine.
      **Still a known gap:** Safari's native HLS has no hook to rewrite segment
      requests, so Safari depends on WebRTC and therefore on TURN above.
      Re-check by forcing the fallback (block UDP, or stub `Hls.isSupported()`) and
      watching the network tab for segment 403s.
- [ ] **Set `CRON_SECRET`** in Vercel (SEC-180). `/api/cron/reconcile-cameras`
      corrects camera status against Ant Media; it **fails closed** without the
      secret, so an unset value means every run 401s and status silently stops
      being reconciled. Confirm one run returns `{"ok":true}` with a plausible
      `checked` count.
- [ ] **Store the same secret plus the site URL in Supabase Vault** — the 15-minute
      schedule runs from pg_cron, not Vercel (migration 021), because **Vercel
      Hobby rejects any sub-daily cron at deploy time**. Run once per environment:
      ```sql
      select vault.create_secret('https://<domain>', 'primex_site_url');
      select vault.create_secret('<CRON_SECRET>',    'primex_cron_secret');
      ```
      Until both exist the job logs a warning and does nothing — deliberately, so a
      missing secret isn't an invisible 401 every 15 minutes. Verify with
      `select public.trigger_camera_reconcile();` (non-null = request sent) and
      check `net._http_response` for the status.
      The daily Vercel cron is kept as a backstop: pg_net is fire-and-forget, so an
      external run also proves the endpoint is reachable. Reconciliation is
      idempotent, so both running is harmless.
- [x] **AMS app setting `rtspPullTransportType` set to `tcp`** for every app that
      pulls RTSP (SEC-201). This is an **application** setting — AMS reads it in
      `StreamFetcher` and passes it to ffmpeg as `rtsp_transport`, so it cannot be set
      per-broadcast and `createStreamSource()` has no field for it. Change it in the
      AMS dashboard (App → Settings) or via the management REST API; the default
      (`prefer_tcp`) can still negotiate UDP.
      **Why it matters:** the site-gateway MTU fix relies on an MSS clamp
      (`--clamp-mss-to-pmtu`), and a clamp only applies to TCP. Left on the default,
      the RTSP pull may negotiate UDP, the clamp does nothing, and oversized packets
      keep vanishing into the MTU black hole (SEC-197 / SEC-198).
- [ ] While in there, review `rtspTimeoutDurationMs` — it feeds ffmpeg's RTSP
      `timeout`, so it decides how long a lossy tunnel may stall before AMS gives up
      and the stream flaps.
- [ ] Deploy the Python `ai_worker` separately — **see `docs/ai-worker-deploy.md`**
      for the full runbook (Docker, sizing, first-light validation, troubleshooting).
      Its own env; Community Edition works after SEC-138, Enterprise needs `ANTMEDIA_API_KEY`
      byte-identical to the app's.
- [ ] `supabase functions deploy ai-event-ingest` **and**
      `supabase functions deploy camera-heartbeat`, then set `AI_WORKER_SECRET` as a
      Supabase secret — the worker's POSTs 401 without it, and both functions fail
      closed when it is unset rather than accepting anonymous writes.
      `camera-heartbeat` is what makes `cameras.last_frame_at` mean "we saw a frame"
      instead of "Ant Media said something" (SEC-204). Skipping it is not fatal —
      the worker logs a warning and carries on detecting — but the column stays
      dead and every beat writes a 404 to the worker log.
- [ ] Add the worker droplet's IP to the **Ant Media REST allowlist**, or every
      Enterprise snapshot fetch 403s and the worker detects nothing while looking healthy.

---

## 4. Deploy & verify

- [ ] Ensure Vercel builds from `master` (all this session's work is pushed).
- [ ] Redeploy **after** env vars are set (so they take effect).
- [ ] **Billing:** subscribe as a company_manager with a real/test-clock card →
      row lands in `subscriptions`, webhook shows `200`. Cancel → card shows
      "cancels at period end".
- [ ] **Push:** enable Push in Settings (grant permission) → trigger a critical
      alert → notification arrives.
- [ ] **Email:** critical alert → email delivered (check Resend logs).
- [ ] **Streaming:** open a live camera → confirm the `WebRTC` pill (not `HLS`) and
      low latency against the live Ant Media server.
- [ ] **SEO/OG:** run a link-preview debugger on `/` → card renders.

---

## Open tracker (Linear)

The blocked-on-external list this section used to carry is closed — SEC-152,
SEC-94, SEC-141, SEC-194, SEC-195, SEC-196 and the SEC-197/198/199/200 site
networking chain are all Done as of 2026-08-11.

What is genuinely still open, and why:

| Issue | State | What remains |
|---|---|---|
| **SEC-202** | In Progress | No AMS webhook delivery has been *observed*. Until one is, camera status, drop telemetry and recordings are unproven in production. |
| **SEC-190** | Todo | Bucket lifecycle window vs `evidence_retention_days` still needs reconciling — see Recordings retention above. This is the item that can lose evidence. |
| **SEC-192** | Todo | Viewer caps shipped; the load test to find the real per-droplet knee, and the origin/edge split plan, did not. Nobody has measured the ceiling. |
| **SEC-203** | Backlog | Nothing pages a human when a camera goes dark. Needs a policy decision on the threshold before it can be built. |
| **SEC-129** | Backlog | Stripe live-mode provisioning — parked pending monetisation strategy. |
| **SEC-148** | — | Web push VAPID keys, if push is wanted at launch. |

Not go-live blockers, tracked separately: SEC-160 (custom RBAC), SEC-185 (worker
frame pipeline), SEC-95 (Claude Vision report insights).
