# Primex — Streaming Architecture (PUSH)

**Status: decided 2026-09-15. The code has not caught up yet.**

This document is the authority on how video gets from a customer's DVR to the app.
Where it disagrees with `primex/CLAUDE.md`, the specs under
`primex/docs/superpowers/`, or anything in `primex/src/`, **this document is right and
they are stale** — see [What the code still does](#what-the-code-still-does).

---

## The shape of the product

Primex ships a **pre-configured gateway device** to a non-technical customer. They plug
in two cables — power, and Ethernet to their router — and their DVR's cameras appear in
the web app. A remote, non-engineering support team manages everything. It has to work
at 100+ sites without a truck roll.

Every architectural decision below follows from that one sentence. The customer cannot
be asked to configure a firewall, and support cannot be asked to debug one.

---

## The data path

```
DVR (local RTSP)
  → pusher on the gateway (ffmpeg -c copy, SRT caller mode)
  → outbound SRT, UDP 4200, AES passphrase
  → AMS SRT ingest (streamId "WebRTCAppEE/<siteStreamId>")
  → AMS (server-side ABR later, as a normalisation backstop)
  → WebRTC / HLS
  → the app
```

**The direction is the whole point.** The connection originates *inside* the customer
network and travels outward. Outbound connections cross CGNAT, double NAT, 5G home
internet and consumer firewalls with no port forwarding, no inbound tunnel and nothing
for the customer to configure.

### Transport

- **SRT in caller mode** is primary: ARQ loss recovery, automatic reconnect on drop, AES
  encryption. Start the `latency` buffer around **800 ms** — it absorbs WAN blips that
  would otherwise surface as a dropped stream.
- **RTMP push is the fallback** transport where SRT isn't available.

### Pusher

- **ffmpeg built with libsrt**, copy mode (`-c copy`). No transcoding at the edge, ever —
  the gateway does not have the headroom and normalisation belongs on the server.
- go2rtc and MediaMTX **cannot originate an SRT push** (go2rtc publishes RTMP only). Use
  go2rtc only on the RTMP fallback path.
- Stock OpenWrt ffmpeg lacks SRT. Two supported shapes:
  - a static arm64 ffmpeg-with-libsrt binary on the Beryl AX (USB storage), or
  - **a companion Raspberry Pi running distro ffmpeg under systemd** — the recommended
    standard at 100+ sites, because it is the one that stays maintainable.
- **Auto-recovery is supervision, not logic:** procd `respawn` on OpenWrt, or
  `Restart=always` under systemd. Let ffmpeg die on WAN loss and respawn.

### Server

- SRT ingest is built into Ant Media Enterprise, default **UDP 4200**. StreamId format is
  `appName/streamId`.
- Per-site **AES passphrase** plus an AMS **publish token** (one-time or TOTP).
- Server-side ABR/transcoding is currently **disabled** (`settings.encoderSettings=[]` in
  `WEB-INF/red5-web.properties`). Forced transcode failed on odd DVR frame dimensions and
  produced empty HLS playlists. Correct DVR configuration is the primary control; re-enable
  ABR as the backstop *after* the droplet upgrade.

---

## Why pull is dead

The original design had AMS reach *into* the customer LAN over a VPN to pull RTSP. It
failed twice, on hardware of two different classes:

| | Device | Tunnel | Outcome |
|---|---|---|---|
| v1 | GL.iNet Opal GL-SFT1200 | hand-rolled WireGuard, `ip rule` return-path routing, MTU pinned 1280, conntrack tuning, rc.local persistence, cron watchdog | Underpowered (load ~1.4 idle, ~65 Mbps WG ceiling). **Reverts its own MTU at runtime.** Path degraded to 20–100% packet loss. |
| v2 | GL.iNet Beryl AX GL-MT3000 (capable hardware) | Tailscale subnet routing | Auth timed out (`context deadline exceeded`) because the customer's WAN link flapped — it was on a WiFi-repeater backhaul. Ant Media's own engineer measured **55% loss** to the gateway's tunnel IP. |

**The conclusion is structural, and customer, vendor and Ant Media's engineer all concur:**
any pull design needs a stable, always-reachable *inbound* path into the customer network.
That cannot be guaranteed across real consumer ISPs. Pull was not mis-tuned. It was wrong.

> **This also closes an open mystery.** The "RTMP publish drops every 90–180s" logged
> against SEC-192 — live p50 79s, gap p50 22s, ~70 events/hour, unbroken — was the
> degraded tunnel. Not AMS, not the DVR. The separate capacity finding (**≥30 concurrent
> WebRTC viewers per stream**, ceiling not reached) is unaffected and still stands.

**Do not reintroduce** `streamSource` pulls, VPN routing, or any dependency on reaching
into a customer LAN from the cloud. A lightweight management tunnel for *router admin
only* is acceptable; it must stay off the video path.

---

## Provisioning rules (hard)

These are shipping requirements, not preferences. Each one is a failure already paid for.

- **The gateway WAN must be wired to the customer's router.** WiFi backhaul is banned —
  it is what killed v2.
- **DVR encoder:** H.264 (not H.265), CBR ~2048 kbps, I-frame interval 30–60, Hikvision
  **"H.264+" OFF**.
- **Per-site streamId, AES passphrase and publish token baked in before shipping.**
- **WAN-pull auto-recovery tested before shipping** — unplug the WAN, confirm the stream
  returns on its own.

## Server sizing

The current droplet (NYC1, `64.227.21.176`, **2 vCPU / 4 GB**) is **below Ant Media's
stated minimum of 4 vCPU / 8 GB**. Upgrade before onboarding more sites; plan 8–16 vCPU
for 100+ concurrent ingests. Re-enabling ABR depends on this.

---

## The pilot

One real site: Amar (US East). A SANNCE / Hikvision-OEM **analog** DVR — cameras are BNC
coax into the DVR, so there are no per-camera IPs. The DVR does the H.264 encoding and
serves RTSP at `192.168.0.157:554`, path `/Streaming/Unicast/channels/<ch>01`. The working
camera is channel 1 (`channels/101`), stream `amar-cam-01`.

**There is exactly one pilot camera.** Any claim in the app or its copy of more than that
is wrong.

### Second-brand compatibility (open)

The customer has access to a TVT-based DVR (SuperLive Plus app). Its QR/P2P access is
app-only and exposes no RTSP, so the DVR must be reachable on a LAN. Plan: bring it onto
the pilot LAN and point the pusher at its RTSP (TVT-style path, e.g.
`chID=1&streamType=main`). This is what validates "any RTSP DVR works" for the push design.

---

## What the code still does

Verified 2026-09-15. Treat this section as the gap list, and keep it honest.

- `createStreamSource()` in `primex/src/lib/data/actions/streaming.ts` still creates
  `type: 'streamSource'` **pull** broadcasts, and is still wired into
  `add-camera-modal.tsx` and `edit-camera-modal.tsx`.
- **There is no SRT anywhere in `primex/src/`.**
- `createBroadcast()` already creates a `type: 'liveStream'` broadcast and mints a publish
  token (SEC-178) — so the *push-target* half exists for RTMP and is the foundation to
  build SRT onto, not something to rewrite.
- Playback is by `streamId` and is **unchanged** by any of this. It keeps working the
  moment a stream is published rather than pulled.
- The AMS listener hook already maps `liveStreamStarted` / `liveStreamEnded`
  (`lib/streaming/webhook-events.ts`), so offline *detection* exists. The missing piece is
  the alert when a site's stream ends and does not re-publish within N seconds (SEC-203) —
  blocked only on choosing N. Gateways have gone dark silently more than once; this is now
  a must-have, not a nice-to-have.

### Notes for whoever implements this

- The RTSP URL becomes **site-side config** — it is what the pusher reads. Keep it on the
  camera record for provisioning and support, but **stop sending it to AMS.** It embeds
  the DVR password; the existing treatment of `source_url` as a secret (super_admin-gated,
  off the `Camera` type — SEC-177) is correct and must survive the migration.
- A deterministic `streamId` scheme (e.g. `site-<siteId>-cam-<n>`) has to go **through**
  `assertMayAssignStreamId()` and migration 018's partial unique index, not around them.
  `stream_id` is super_admin-only because whoever sets it chooses whose video they watch
  (SEC-176).
- The per-site **pusher config bundle** is a deliverable: streamId, passphrase, token, AMS
  host/port, DVR RTSP URL/channel, and the procd/systemd unit text. That bundle is what
  support burns onto a gateway before it ships.

---

## Secrets

**Rotation is overdue.** The DVR admin password, the AMS `jwtSecretKey`, the old Opal and
GoodCloud passwords, the WireGuard keys and the webhook secret have all appeared in chat
transcripts and been shared with an outside engineer and with the Ant Media vendor.

One coupling to know before rotating: the AMS `jwtSecretKey` is `ANTMEDIA_API_KEY`, and
**`primex/ai_worker/antmedia_jwt.py` signs with the same value**. Rotate Vercel alone and
the worker's snapshot fetches begin failing against Enterprise with a 403 that looks
exactly like an IP-allowlist problem. Rotate both in one window.

Never commit or log any of these.

---

## Also open

- **The AMS Enterprise licence renewal was due 2026-08-24.** Verify its status first: SRT
  ingest, token control and the REST JWT auth the provisioning layer depends on are all
  Enterprise-only. If the licence lapsed, push does not work any better than pull did.
- **There is no recordings bucket.** `primex-recordings` — the name in `.env.example`, the
  specs and both `CLAUDE.md` files — is unprovisioned on this account. The bucket named
  `primex` in `sgp1` **belongs to a third party; never point anything at it.** Create
  `primex-recordings` in `nyc3` (co-located with the droplet) when recordings ship.
  Migration 020's evidentiary-hold logic is applied, but no recordings exist.
