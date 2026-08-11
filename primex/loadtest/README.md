# Streaming capacity harness (SEC-192)

Measures how many concurrent WebRTC viewers the origin Ant Media droplet carries
before delivery degrades, so `ANTMEDIA_WEBRTC_VIEWER_LIMIT` can be a measurement
rather than a guess.

## Why it exists

Every `CameraPlayer` opens its own peer connection straight to the single origin
droplet. There is no edge tier. The dispatcher alert detail renders a player
inline, so several dispatchers watching the same busy site during an incident all
fan in to one box at the moment ingest load is also highest — and nobody had
measured what that box can take.

A viewer cap does not add capacity. It decides what happens at the limit: the
next viewer is refused, instead of every stream degrading together. That only
works if the number is real.

## Running it

```bash
# from primex/
node loadtest/run.mjs --confirm=i-am-load-testing-a-live-server \
  --start=5 --step=5 --max=40 --hold=20000
```

It refuses to start without the `--confirm` phrase, because it puts synthetic
viewers on a live server. There is no dry run that produces a number: a number
that did not come from a loaded server is not a measurement.

`--ffmpeg=<path>` if ffmpeg is not on PATH.

## What it does to the server

- Creates its own disposable broadcast (`primex-loadtest-<epoch>`) and publishes
  an ffmpeg test pattern into it. **Real camera streams are never the target** —
  the load lands on a stream that exists only for the run and is deleted after.
- Opens WebRTC viewers against that stream only.
- Deletes the broadcast and kills the publisher in a `finally`, so an abort or a
  crash still cleans up.

## What stops it

`ramp.mjs` holds the rules, and they are unit-tested (`npm test`):

| Condition | Why |
|---|---|
| **A guarded camera stops broadcasting** | Anything already live when the run started is a real camera. If one drops we stop, whether or not we caused it — establishing that we didn't is not worth the risk. Checked before any threshold. |
| Connect rate below 90% | Viewers are being refused or timing out. |
| p95 time-to-first-frame above 8s | Still "connected", no longer watchable. |
| Server counts >15% fewer viewers than connected | AMS is shedding in a way the client can't see. |

## What it found (2026-08-11)

At least **30 concurrent WebRTC viewers** on one stream against the production
droplet, 100% connect rate, AMS's own count matching the client's exactly at
every step. No run ever failed for a capacity reason.

Full write-up, including the recommended cap and the origin/edge plan:
`docs/streaming-capacity.md` (repo root `docs/`).

**The RTMP publish feeding the test stream dies every 90–180s**, reproduced four
times. That is what ended every run. It also looks exactly like saturation — an
early version of this harness read it as a viewer ceiling of 3 — which is why
`run.mjs` now marks a run cut short when the publisher restarts mid-step instead
of reporting a number.

## The honest limitation

The synthetic viewers run in **one local Chromium**. Every viewer decodes video
on the machine running the test, so past a few dozen tabs that machine is the
bottleneck, not the droplet. A run that completes without failing therefore
proves a **floor** — "the server carried at least N" — and the report says
`reachedCeiling: true` rather than claiming a knee it never found.

To find a genuine knee above that floor, run the harness from several droplets in
the same region concurrently, each with `--start`/`--max` covering a shard, and
add the per-run `connected` counts. The server-side numbers in the report
(`serverViewerCount`) are what you sum — they are AMS's own count, not the
client's belief.

Server CPU would settle this in one run, but the management REST API
(`/rest/v2/system-resources`) returns 403 to the app JWT — it needs management
user credentials, which the app does not hold. Add them and the sampler can read
CPU directly; until then the thresholds above are all client-observable.

## Output

`loadtest/results/<streamId>.json` — every step, the thresholds it was judged
against, the guarded streams, the abort reason if any, and the suggested cap
(70% of the last good step, leaving headroom for ingest, recording and the AI
worker's snapshot polling competing for the same box).

Results are gitignored; paste the summary into the issue or the deploy doc.
