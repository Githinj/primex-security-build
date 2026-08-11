"""Supervisor — manages camera task lifecycle based on Supabase state."""

import asyncio
import logging
import os
import time
from dataclasses import dataclass

from supabase import create_client

from camera_task import CameraTask
from cooldown import CooldownRegistry
from config import WorkerConfig, load_config
from detector import Detector
from event_poster import EventPoster
from stats import WorkerStats

logger = logging.getLogger(__name__)

SYNC_INTERVAL_S = 30
# Missing three consecutive syncs means the supervisor loop is wedged or
# Supabase is unreachable — the camera roster on file is no longer trustworthy.
SYNC_STALE_AFTER_S = SYNC_INTERVAL_S * 3


@dataclass
class CameraInfo:
    camera_id: str
    site_id: str
    stream_id: str
    zones: list[dict]
    business_hours: dict
    timezone: str


class Supervisor:
    def __init__(self, config: WorkerConfig):
        self.config = config
        self.detector = Detector()
        self.cooldown = CooldownRegistry(cooldown_s=config.cooldown_s)
        self.poster = EventPoster()
        self._tasks: dict[str, asyncio.Task] = {}
        self._camera_tasks: dict[str, CameraTask] = {}
        self._camera_info: dict[str, CameraInfo] = {}
        self._last_sync_at: float | None = None

        self.stats = WorkerStats()

        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        self._supabase = create_client(url, key)

    async def run(self):
        asyncio.create_task(self.detector.start())
        logger.info("Supervisor started. Syncing cameras every %ds.", SYNC_INTERVAL_S)

        while True:
            try:
                self._refresh_config()
                await self._sync_cameras()
            except Exception as e:
                logger.error(f"Supervisor sync error: {e}")
            await asyncio.sleep(SYNC_INTERVAL_S)

    def _refresh_config(self) -> None:
        """Re-read `ai_worker_config` and apply it if it changed (SEC-169).

        Config used to be read once at process start, so retuning the worker
        meant a redeploy. `CameraTask` and `BehaviorTracker` capture their
        thresholds at construction, so applying a change means recreating the
        tasks: they are cancelled here and `_sync_cameras` rebuilds them on the
        same tick with the new values.

        That deliberately costs in-flight tracker state — a person part-way to
        the lingering threshold starts counting again. Restarting is the honest
        trade for a rare, admin-initiated change, and is far simpler to reason
        about than mutating thresholds under a running loop.

        A failed read leaves the current config in place: a Supabase blip must
        not silently reset a tuned worker to defaults.
        """
        try:
            new_config = load_config(self._supabase)
        except Exception as e:
            logger.warning(f"Could not re-read worker config, keeping current: {e}")
            return

        if new_config == self.config:
            return

        logger.info("Worker config changed: %s -> %s", self.config, new_config)
        self.config = new_config
        # The registry is shared across cameras and holds no per-task state
        # worth preserving, so the new window applies without recreating it.
        self.cooldown.cooldown_s = new_config.cooldown_s

        for cam_id, task in self._tasks.items():
            logger.info("Restarting camera task %s to apply new config", cam_id)
            task.cancel()
        self._tasks.clear()
        self._camera_tasks.clear()

    async def _sync_cameras(self):
        resp = self._supabase.table("cameras").select(
            "id, site_id, stream_id, status, camera_ai_config!inner(enabled, zones)"
        ).eq("status", "Online").eq("camera_ai_config.enabled", True).not_.is_("stream_id", "null").execute()

        active_cameras: dict[str, CameraInfo] = {}
        site_ids: set[str] = set()

        for row in resp.data or []:
            site_ids.add(row["site_id"])
            ai_config = row["camera_ai_config"]
            if isinstance(ai_config, list):
                ai_config = ai_config[0] if ai_config else {"enabled": True, "zones": []}

            active_cameras[row["id"]] = CameraInfo(
                camera_id=row["id"],
                site_id=row["site_id"],
                stream_id=row["stream_id"],
                zones=ai_config.get("zones", []),
                business_hours={},
                timezone="Australia/Sydney",
            )

        if site_ids:
            bh_resp = self._supabase.table("site_business_hours").select("*").in_("site_id", list(site_ids)).execute()
            bh_map = {r["site_id"]: r for r in (bh_resp.data or [])}
            for cam_info in active_cameras.values():
                bh = bh_map.get(cam_info.site_id)
                if bh:
                    cam_info.business_hours = bh.get("hours", {})
                    cam_info.timezone = bh.get("timezone", "Australia/Sydney")

        to_stop = set(self._tasks.keys()) - set(active_cameras.keys())
        for cam_id in to_stop:
            logger.info(f"Stopping camera task: {cam_id}")
            self._tasks[cam_id].cancel()
            del self._tasks[cam_id]
            self._camera_tasks.pop(cam_id, None)
            self.detector.forget_camera(cam_id)
            if cam_id in self._camera_info:
                del self._camera_info[cam_id]

        to_start = set(active_cameras.keys()) - set(self._tasks.keys())
        for cam_id in to_start:
            info = active_cameras[cam_id]
            self._camera_info[cam_id] = info
            task = CameraTask(
                camera_id=info.camera_id,
                site_id=info.site_id,
                stream_id=info.stream_id,
                zones=info.zones,
                business_hours=info.business_hours,
                timezone=info.timezone,
                detector=self.detector,
                cooldown=self.cooldown,
                poster=self.poster,
                snapshot_interval_s=self.config.snapshot_interval_s,
                dwell_threshold_s=self.config.dwell_threshold_s,
                confidence_threshold=self.config.confidence_threshold,
                antmedia_url=os.environ.get("ANTMEDIA_URL", ""),
                antmedia_secret=os.environ.get("ANTMEDIA_API_KEY", ""),
                antmedia_app=os.environ.get("ANTMEDIA_APP", "LiveApp"),
                stats=self.stats,
            )
            self._camera_tasks[cam_id] = task
            self._tasks[cam_id] = asyncio.create_task(task.run())
            logger.info(f"Started camera task: {cam_id}")

        self._last_sync_at = time.time()

    def get_health(self) -> dict:
        active = len(self._tasks)
        degraded = sorted(
            cam_id for cam_id, task in self._camera_tasks.items() if task.is_degraded
        )

        sync_age_s = (
            None if self._last_sync_at is None else int(time.time() - self._last_sync_at)
        )
        sync_stale = sync_age_s is None or sync_age_s > SYNC_STALE_AFTER_S

        # Degraded when the camera roster can't be trusted, or when every camera
        # we're supposed to be watching is failing. A worker with zero cameras
        # is idle, not broken — that's a legitimate configuration.
        healthy = not sync_stale and not (active > 0 and len(degraded) == active)

        return {
            "status": "healthy" if healthy else "degraded",
            "active_cameras": active,
            "degraded_cameras": degraded,
            "sync_age_s": sync_age_s,
            "inference_queue_depth": self.detector.queue_depth,
            "frames_processed_last_min": self.stats.frames.count(),
            "alerts_fired_last_min": self.stats.alerts.count(),
            "gpu_errors_last_min": self.stats.gpu_errors.count(),
            "gpu_errors_total": self.stats.gpu_errors.total,
            "uptime_s": self.stats.uptime_s(),
        }
