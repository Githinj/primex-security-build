# Streaming capacity and the origin/edge split (SEC-192)

Measured 2026-08-11 against the production Ant Media server
(`stream.reclaimrecoveryapp.com`, Enterprise Edition 2.14.0, single droplet).

Harness and method: `primex/loadtest/` — see its README. Raw per-run output is
gitignored; the numbers below are the summary.

## What was measured

Synthetic WebRTC viewers on a disposable broadcast (640x360, 15fps, 600 kbps,
2s GOP — chosen to sit near the substream profile the real cameras publish),
ramped in steps, with the two live camera streams guarded so the run would stop
if either dropped.

| Concurrent viewers | Connected | Server's own count | p95 first frame |
|---|---|---|---|
| 5 | 5/5 | 5 | 8.9s (baseline) |
| 10 | 10/10 | 10 | 9.2s (1.0×) |
| 15 | 15/15 | 15 | 9.2s (1.0×) |
| 20 | 20/20 | 20 | 10.2s (1.1×) |
| 25 | 25/25 | 25 | 10.6s (1.2×) |
| 30 | 30/30 | 30 | 12.2s (1.4×) |

A second run reached 30 independently with first-frame time flat at 14.3s
(1.0×) throughout.

**Result: at least 30 concurrent WebRTC viewers on a single stream, with no
failures and no degradation attributable to the server. The ceiling was not
found.**

Every viewer connected, and AMS's own viewer count matched the client's belief
exactly at every step — so the server was not silently shedding.

### Why the ceiling was not found

Not because the server refused: **no run ever failed for a capacity reason.**
Every run ended when the RTMP publish feeding the test stream died — see below.

Two other limits are worth knowing before anyone repeats this:

- The synthetic viewers run in one local Chromium, so past a few dozen the test
  machine competes with the server to be the bottleneck. Part of the first-frame
  drift from 8.9s to 12.2s is almost certainly local.
- Server CPU could settle it in one run, but management REST
  (`/rest/v2/system-resources`) returns **403 to the app JWT** — it needs
  management-user credentials the app does not hold. Every threshold in the
  harness is therefore client-observable by necessity.

To find the real knee, run the harness from several droplets in the same region
and sum the server-side counts. Run the *publisher* on a droplet too, not from an
office connection.

## Finding: RTMP publish will not stay up

Reproduced on **four consecutive runs**: an RTMP publish from a laptop to this
server aborts after roughly 90–180 seconds, with `WSAECONNABORTED` /
`WSAECONNRESET`. Removing the audio track — every ffmpeg error named the audio
muxer — did not fix it.

This is what ended each run, and it is more consequential than the number above:

- It looks exactly like saturation. When the publisher dies, the stream stops,
  new viewers fail, and the server reports zero viewers. An early version of the
  harness read that as a viewer ceiling of **3**. The harness now detects a
  publisher restart mid-step and marks the run cut short rather than reporting a
  number — worth knowing about before trusting any capacity figure.
- The production cameras use **RTSP pull** (`streamSource`), where AMS connects
  outward, so they do not take this path. Any camera moved to **RTMP push**
  would.
- It may be the network path from that machine rather than the server. It has not
  been isolated. Re-test by publishing from a droplet in the same region: if it
  holds there, the path is the problem; if it drops there too, the server is.

Related: the two live cameras were observed flapping between `broadcasting` and
`finished` across probes minutes apart, which is consistent with an unstable
ingest and is worth watching independently.

## Recommended setting

```
ANTMEDIA_WEBRTC_VIEWER_LIMIT=30
```

Thirty is what was proven to work, not a guess, and it is generous for the actual
use case — a handful of dispatchers on one camera. Raise it once a distributed
test finds the real knee.

`viewerLimits()` in `src/lib/data/actions/streaming.ts` applies it at creation and
on the 409 update path, so **existing broadcasts need re-provisioning** to pick it
up. Unset leaves AMS's default of `-1` (unlimited), which is where production sits
today: verified on both live broadcasts, `webRTCViewerLimit: -1`.

A cap adds no capacity. It decides what happens at the limit: the next viewer is
refused, instead of every stream on the box degrading together.

## The origin/edge split, before it is needed

AMS clustering is a configuration change if designed for, and a migration if not.
The trigger to plan against is not a viewer count — it is the first customer whose
site has more than a couple of simultaneous watchers, or the first time the AI
worker and a live incident compete for the same box.

Today one droplet does everything: RTSP ingest for every camera, WebRTC egress for
every viewer, HLS packaging, MP4 recording, and answering the AI worker's
per-camera snapshot polling. Those have completely different scaling curves, and
the viewer side is the one that grows with customers rather than with cameras.

The split, in the order it should happen:

1. **Separate the recording/VOD storage path first.** It is the least coupled and
   already writes to DO Spaces; moving it off the origin buys headroom without
   touching playback.
2. **Add one edge node.** In AMS clustering, origin takes ingest, edges take
   playback. The app change is small and already half-anticipated: playback URLs
   come from `getStreamToken()`, so pointing viewers at an edge host is a
   configuration concern rather than a component rewrite. The signaling URL the
   real player uses already carries `?target=edge`.
3. **Keep the cap per-broadcast.** With edges, the cap protects an edge rather
   than the whole service — which is the point.

What has to be true before edges help: tokens must validate on the edge (they are
minted against the shared secret, so they do), and the webhook must keep firing
from the origin only, or `stream_events` will double up.

**Do not add edges to fix the RTMP publish instability above.** That is an ingest
problem and edges do not carry ingest.
