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
| `ANTMEDIA_API_KEY` | 🔑💤 | Enterprise only — HS256 **signing secret** (AMS `jwtSecretKey`), not a token; app signs a 60s JWT per REST call. Same value in `ai_worker` env (per-stream tokens + REST snapshot) |

### Recordings (DigitalOcean Spaces)
| Var | | Notes |
|-----|---|-------|
| `DO_SPACES_RECORDINGS_BUCKET` | ⚙️ | Bucket name |
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
