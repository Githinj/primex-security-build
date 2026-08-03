"""Supervisor — manages camera task lifecycle based on Supabase state."""

import asyncio
import logging
import os
import time
from dataclasses import dataclass

from supabase import create_client

from camera_task import CameraTask
from cooldown import CooldownRegistry
from config import WorkerConfig
from detector import Detector
from event_poster import EventPoster

logger = logging.getLogger(__name__)

SYNC_INTERVAL_S = 30


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
        self._camera_info: dict[str, CameraInfo] = {}

        self.stats = {
            "active_cameras": 0,
            "frames_processed_last_min": 0,
            "alerts_fired_last_min": 0,
            "start_time": time.time(),
            "gpu_errors": 0,
        }

        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        self._supabase = create_client(url, key)

    async def run(self):
        asyncio.create_task(self.detector.start())
        logger.info("Supervisor started. Syncing cameras every %ds.", SYNC_INTERVAL_S)

        while True:
            try:
                await self._sync_cameras()
            except Exception as e:
                logger.error(f"Supervisor sync error: {e}")
            await asyncio.sleep(SYNC_INTERVAL_S)

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
                door_open_threshold_s=self.config.door_open_threshold_s,
                confidence_threshold=self.config.confidence_threshold,
                antmedia_url=os.environ.get("ANTMEDIA_URL", ""),
                antmedia_secret=os.environ.get("ANTMEDIA_API_KEY", ""),
                antmedia_app=os.environ.get("ANTMEDIA_APP", "LiveApp"),
            )
            self._tasks[cam_id] = asyncio.create_task(task.run())
            logger.info(f"Started camera task: {cam_id}")

        self.stats["active_cameras"] = len(self._tasks)

    def get_health(self) -> dict:
        return {
            "status": "healthy",
            "active_cameras": self.stats["active_cameras"],
            "frames_processed_last_min": self.stats["frames_processed_last_min"],
            "alerts_fired_last_min": self.stats["alerts_fired_last_min"],
            "uptime_s": int(time.time() - self.stats["start_time"]),
        }
