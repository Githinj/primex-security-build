# AI Worker — Deployment Runbook

Deploys the Python detection worker (`primex/ai_worker/`) to a DigitalOcean droplet. The worker polls camera snapshots from Ant Media, runs YOLOv8 inference, applies behaviour heuristics, and POSTs detected events to the `ai-event-ingest` Supabase Edge Function, which creates the alert and incident.

The worker runs **independently of the Next.js app** — it is not deployed by Vercel and shares no runtime with it. The only things they share are the Supabase project, the DO Spaces buckets, and the Ant Media signing secret.

---

## 1. Sizing

Inference is **serialized**: one `Detector`, one queue, one frame in flight at a time (`detector.py`). Extra vCPUs make each inference faster, but they do not run inferences concurrently. So the ceiling is:

```
max cameras ≈ poll_interval_s ÷ inference_latency_s
```

At the default 2s poll interval and roughly 100ms per `yolov8n` frame on a modern vCPU, that's **~20 cameras** before the queue starts backing up. Watch `inference_queue_depth` on `/health`: sustained growth means you've hit the ceiling.

**Start with CPU.** A 4 vCPU / 8 GB droplet is the sensible starting point. GPU only becomes worth its cost past the ceiling above, or if you lower `snapshot_interval_s`.

> These are estimates from the model size and poll interval, not measurements — nobody has benchmarked this workload yet. Confirm against `frames_processed_last_min` once real cameras are attached.

## 2. Prerequisites

Before deploying, these must already be true:

- [ ] **Edge Function deployed.** From `primex/`: `supabase functions deploy ai-event-ingest`
- [ ] **`AI_WORKER_SECRET` set in Supabase** (`supabase secrets set AI_WORKER_SECRET=...`) — the function rejects everything without it, and the same value goes in the worker's env
- [ ] **Droplet IP added to the Ant Media REST allowlist.** Production AMS blocks non-whitelisted IPs on the REST API, which is exactly the snapshot endpoint the worker uses in Enterprise mode. Skipping this produces 403s on every snapshot and a worker that looks alive but detects nothing
- [ ] **At least one camera** with `stream_id` set, `status = 'Online'`, and `camera_ai_config.enabled = true` — the supervisor's query requires all three
- [ ] **DO Spaces credentials on the app side** can read the frames bucket, or alert snapshots 403 (frames are uploaded `ACL=private`)

## 3. Environment

Copy `primex/ai_worker/.env.example` to `.env` on the droplet and fill it in. Never bake it into the image — `.dockerignore` excludes it deliberately.

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_KEY` | **Service role** key — the worker reads cameras and business hours bypassing RLS |
| `AI_WORKER_SECRET` | Must equal the secret set on the Edge Function |
| `ANTMEDIA_URL` | `https://…:5443` in production (Enterprise, SSL) |
| `ANTMEDIA_APP` | `WebRTCAppEE` on Enterprise, `LiveApp` on Community. **Must match the Next.js app's value** |
| `ANTMEDIA_API_KEY` | Enterprise HS256 **signing secret** (AMS `jwtSecretKey`), not a token. **Must be byte-identical to the app's** — both runtimes sign the same JWT and both break if they drift. Leave blank on Community, and the worker falls back to grabbing frames off the HLS playlist |
| `DO_SPACES_ENDPOINT` / `_KEY` / `_SECRET` / `_BUCKET` | Frame uploads. Bucket is separate from the recordings bucket |
| `HEALTH_PORT` | Default 8080 |
| `MISSED_EVENTS_FILE` | Set to `/data/missed_events.jsonl` under Docker so failures survive container recreation |

The two Ant Media values are the most common source of a silently non-functional worker. If the app can play video but the worker gets 403s, compare `ANTMEDIA_API_KEY` on both sides before anything else.

## 4. Deploy

```bash
# On the droplet
git clone https://github.com/Githinj/primex-security-build.git
cd primex-security-build/primex/ai_worker

cp .env.example .env && ${EDITOR:-nano} .env    # fill in section 3

docker compose up -d --build
docker compose logs -f
```

The image builds CPU-only torch and bakes the `yolov8n.pt` weights, so a restart never depends on the ultralytics CDN. First build takes several minutes; subsequent ones reuse the pip layers.

`restart: unless-stopped` covers reboots — no systemd unit needed. The health check is wired into the container, so `docker ps` shows `healthy` / `unhealthy` directly.

### Updating

```bash
git pull && docker compose up -d --build
```

## 5. First light

The point of this step is to prove the whole chain in one shot: snapshot → inference → heuristic → cooldown → Spaces upload → Edge Function → `create_alert_with_incident` → UI badge.

1. Pick one camera that satisfies the prerequisites in section 2.
2. **Insert a `site_business_hours` row for its site.** Without one, `_is_after_hours()` returns `False` unconditionally and `motion_afterhours` never fires — see SEC-168.
3. Walk in front of the camera, or leave someone in frame past `dwell_threshold_s` (default 300s) for `person_lingering`.
4. Watch `docker compose logs -f` for the POST, then confirm the alert appears in the app with an **AI** badge and a **visible frame image**.

If the alert appears but the image is broken, the problem is presigning (`DO_SPACES_KEY`/`SECRET` on the *app* side), not the worker.

Note that with no zones configured and no business hours, `person_lingering` is the only detection type that can fire at all. `concealment_behavior` and `vehicle_detection` need zones (SEC-167). `door_event` was removed from the worker (SEC-166) — it could never fire, because the detector runs stock YOLOv8 over the COCO classes and COCO has no door. The enum value and the Edge Function's alert mapping are still there, so wiring a real contact sensor later is additive.

## 6. Health and troubleshooting

```bash
curl -s localhost:8080/health | jq
```

Returns **503** when starting or degraded, **200** when healthy.

```json
{
  "status": "healthy",
  "active_cameras": 3,
  "degraded_cameras": [],
  "sync_age_s": 12,
  "inference_queue_depth": 0,
  "frames_processed_last_min": 84,
  "alerts_fired_last_min": 0,
  "gpu_errors_last_min": 0,
  "gpu_errors_total": 0,
  "uptime_s": 3600
}
```

| Symptom | Likely cause |
| --- | --- |
| `active_cameras: 0` | No camera satisfies the supervisor query — check `stream_id` is set, `status = 'Online'`, and `camera_ai_config.enabled = true` |
| All cameras in `degraded_cameras` | Snapshot fetches failing. On Enterprise: droplet IP not on the AMS allowlist, or `ANTMEDIA_API_KEY` differs from the app's. Check logs for `Snapshot fetch returned 403` |
| `sync_age_s` climbing past ~90 | Supervisor loop wedged or Supabase unreachable — the camera roster is stale |
| `inference_queue_depth` growing | Past the throughput ceiling in section 1. Raise `snapshot_interval_s`, cut cameras, or move to GPU |
| `frames_processed_last_min: 0` with cameras active | Snapshots arriving but inference failing — check `gpu_errors_total` and the logs |
| Alerts fire but no image | App-side presigning: `DO_SPACES_KEY`/`SECRET` unset, or those credentials can't read the frames bucket |
| Events posted but no alerts | `AI_WORKER_SECRET` mismatch between worker and Edge Function → 401. Check `missed_events.jsonl` |

### Replaying missed events

Events that fail all three POST retries are appended to `$MISSED_EVENTS_FILE` rather than dropped:

```bash
docker compose exec ai-worker python replay_missed.py
```

On full success the file is renamed `.replayed`.

## 7. GPU variant

Only worth it past the ceiling in section 1. On a GPU droplet with `nvidia-container-toolkit` installed:

1. In the `Dockerfile`, swap the base image for a CUDA runtime (e.g. `nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04`) and install Python in it.
2. Remove the `--index-url https://download.pytorch.org/whl/cpu` flag so pip resolves the CUDA torch build.
3. In `docker-compose.yml`, add:

   ```yaml
   deploy:
     resources:
       reservations:
         devices:
           - driver: nvidia
             count: 1
             capabilities: [gpu]
   ```

The image grows by roughly 2 GB. Nothing in the application code changes — ultralytics picks up the GPU automatically.

## 8. Running the tests

```bash
docker run --rm primex-ai-worker:latest \
  sh -c "pip install -q pytest && python -m pytest -q"
```

Or on a machine with Python: `pip install -r requirements-dev.txt && pytest`.
