# Primex — Consolidated Go-Live Checklist

One place for everything needed to take the platform live. Supersedes the
Stripe-only `docs/stripe-go-live-checklist.md` (still useful for Stripe detail).

**Snapshot (2026-07-10):** app code is deployed to `master`. Remote Supabase is at
migration **015**; **016 (push subscriptions) is pending**. Most integrations
degrade to a graceful no-op when their env is unset, so nothing *breaks* without
them — features just stay dark until provisioned.

---

## 1. Database migrations

Remote (`yolalpykdguctbusbgbe`) has `001`–`015`. Only **`016`** is pending.

```bash
cd primex
npx supabase migration list          # confirm: 016 shows local-only
npx supabase db push                 # applies 016_push_subscriptions (+ any newer)
```

- [ ] Push migration `016` (adds `push_subscriptions` for SEC-148).
- [ ] Seed data is **not** deployed by `db push`. On prod, create real accounts/sites
      through the app/Studio as needed (guard login accounts + `client_sites` mappings
      are absent on remote — see the deploy-state notes).

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
| `ANTMEDIA_RTMP_URL` | ⚙️ | Ingest endpoint cameras publish into. Unset derives plaintext `rtmp://` from `ANTMEDIA_URL` — **set an `rtmps://` value in prod** or the publish token and video cross the network in the clear (SEC-178). ⚠️ **Do not assume port 443.** Probe the server first: on the current prod box (2026-08-10) 443 is a web listener answering `HTTP/1.1 400 Bad Request`, and only plaintext RTMP on **1935** works. An unlistened `rtmps://` port silently breaks ingest (SEC-194) |
| `ANTMEDIA_PUBLISH_TOKEN_TTL_DAYS` | 💤 | Publish-token lifetime, default 365 |

### Recordings (DigitalOcean Spaces)
| Var | | Notes |
|-----|---|-------|
| `DO_SPACES_RECORDINGS_BUCKET` | ⚙️ | Bucket name. ⚠️ Confirm in the DO console — `primex-recordings`, used throughout this repo's specs, **does not exist in any region** (probed 2026-08-10). A bucket named `primex` exists in `sgp1`. SEC-194 |
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

### Recordings retention (SEC-94)
- [ ] Set a **30-day object lifecycle expiry** on the DO Spaces recordings bucket
      (pairs with the DB retention cron from SEC-91).

### Ant Media / AI worker
- [ ] Point `ANTMEDIA_*` at the live server.
- [ ] **Enable token control for BOTH `play` and `publish`** on the AMS app. AMS
      enforces it per-type, so play-only leaves ingest wide open — anyone who
      learns a stream ID can publish into a monitored camera (SEC-178). With
      `ANTMEDIA_API_KEY` set, `createBroadcast()` fails closed rather than issuing
      an unsecured ingest URL, so this must be working before provisioning.
- [ ] **Configure an RTMPS listener on AMS** — as of 2026-08-10 there isn't one.
      Probed: `:1935` completes a real RTMP handshake, `:443` returns
      `HTTP/1.1 400 Bad Request` over TLS (a web listener). Until this is done,
      ingest is plaintext and the publish token crosses the wire in the clear.
- [ ] Then set `ANTMEDIA_RTMP_URL` to that **`rtmps://`** endpoint and re-probe.
      "Port is open" is NOT sufficient — a TCP connect succeeds against the web
      listener too. Confirm the first response byte of an RTMP handshake is `0x03`.
- [ ] Re-issue ingest URLs for any camera provisioned before this change — the old
      URLs carry no token, and the token is shown once at creation.
- [ ] **Verify the webhook actually arrives** (SEC-202). As of 2026-08-10 it never
      has: `listenerHookURL` was `null` on all three live broadcasts and
      `stream_events` / `recordings` are empty, so camera status, drop telemetry
      and recordings are all inert in production.
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
        **Capture the real `Content-Type` and field names from that delivery** and
        record them on SEC-202 / SEC-182 — the route accepts both form-encoded and
        JSON, but the exact payload has still never been observed.
- [ ] **Stand up a TURN server** and set `ANTMEDIA_TURN_URLS` + `ANTMEDIA_TURN_SECRET`
      (SEC-184). The app-side wiring is done — it mints short-lived coturn
      credentials per request and passes them to the player — but without an actual
      relay there is nothing to hand out. Run it over **TLS on 443** so it survives
      firewalls that only allow HTTPS; `ANTMEDIA_TURN_SECRET` is coturn's
      `static-auth-secret`.
      **Why it matters:** with no relay, any viewer behind symmetric NAT or on a
      network blocking outbound UDP silently degrades to HLS with 10–30s latency.
      Note the trap in the verification step below: "confirm the WebRTC pill" passes
      on an office network and fails at exactly the customer sites that matter.
- [ ] **Verify the HLS fallback actually plays** with token control on (SEC-183).
      hls.js now carries the token onto segment requests, but this has not been
      exercised against the live server. Force the fallback (block UDP, or stub
      `Hls.isSupported()`) and watch the network tab for segment 403s.
      Safari's native HLS has no hook to rewrite segment requests and is a known
      gap — it depends on WebRTC, and therefore on TURN above.
- [ ] **Set `CRON_SECRET`** in Vercel (SEC-180). `/api/cron/reconcile-cameras` runs
      every 15 min and corrects camera status against Ant Media; it **fails closed**
      without the secret, so an unset value means every run 401s and status silently
      stops being reconciled. Confirm one run returns `{"ok":true}` with a
      plausible `checked` count.
- [ ] **Set the AMS app setting `rtspPullTransportType` to `tcp`** for every app that
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
- [ ] `supabase functions deploy ai-event-ingest` and set `AI_WORKER_SECRET` as a
      Supabase secret — the worker's POSTs 401 without it.
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

## Blocked-on-external tracker (Linear)
- **SEC-152** — set `NEXT_PUBLIC_SITE_URL` to the prod domain.
- **SEC-94** — DO Spaces 30-day lifecycle policy.
- **SEC-141** — enable AI auto-alerts (needs live camera feed reaching the worker).
- **SEC-148 / SEC-129** — the env + provisioning above.
