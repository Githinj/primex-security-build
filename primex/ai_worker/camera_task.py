"""Per-camera async task loop: poll -> detect -> track -> alert."""

import asyncio
import logging
import time

import httpx

from behavior_tracker import BehaviorTracker, Detection
from cooldown import CooldownRegistry
from detector import Detector
from event_poster import EventPoster

logger = logging.getLogger(__name__)


class CameraTask:
    def __init__(
        self,
        camera_id: str,
        site_id: str,
        stream_id: str,
        zones: list[dict],
        business_hours: dict,
        timezone: str,
        detector: Detector,
        cooldown: CooldownRegistry,
        poster: EventPoster,
        snapshot_interval_s: int = 2,
        dwell_threshold_s: int = 300,
        door_open_threshold_s: int = 120,
        confidence_threshold: float = 0.7,
        antmedia_url: str = "",
        antmedia_token: str = "",
    ):
        self.camera_id = camera_id
        self.site_id = site_id
        self.stream_id = stream_id
        self.detector = detector
        self.cooldown = cooldown
        self.poster = poster
        self.snapshot_interval_s = snapshot_interval_s
        self.confidence_threshold = confidence_threshold
        self.antmedia_url = antmedia_url
        self.antmedia_token = antmedia_token
        self._consecutive_failures = 0

        self.tracker = BehaviorTracker(
            zones=zones,
            business_hours=business_hours,
            timezone=timezone,
            dwell_threshold_s=dwell_threshold_s,
            door_open_threshold_s=door_open_threshold_s,
        )

    async def run(self):
        logger.info(f"Camera task started: {self.camera_id} (stream: {self.stream_id})")
        while True:
            try:
                frame = await self._fetch_snapshot()
                if frame is None:
                    self._consecutive_failures += 1
                    if self._consecutive_failures >= 5:
                        logger.warning(f"Camera {self.camera_id}: 5+ consecutive snapshot failures")
                    await asyncio.sleep(self.snapshot_interval_s)
                    continue

                self._consecutive_failures = 0

                try:
                    detections = await self.detector.submit(frame)
                except Exception as e:
                    logger.error(f"Inference failed for {self.camera_id}: {e}")
                    await asyncio.sleep(self.snapshot_interval_s)
                    continue

                detections = [d for d in detections if d.confidence >= self.confidence_threshold]

                events = self.tracker.process(detections, timestamp=time.time())

                for event in events:
                    if self.cooldown.can_fire(self.camera_id, event.event_type):
                        frame_url = await self.poster.upload_frame(frame, self.camera_id)
                        det_dicts = [
                            {"class": d.cls, "bbox": list(d.bbox), "track_id": d.track_id}
                            for d in detections
                        ]
                        await self.poster.post_event(
                            camera_id=self.camera_id,
                            site_id=self.site_id,
                            event_type=event.event_type,
                            confidence=event.confidence,
                            frame_url=frame_url,
                            detections=det_dicts,
                            metadata=event.metadata,
                        )
                        self.cooldown.mark_fired(self.camera_id, event.event_type)

            except asyncio.CancelledError:
                logger.info(f"Camera task cancelled: {self.camera_id}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error in camera task {self.camera_id}: {e}")

            await asyncio.sleep(self.snapshot_interval_s)

    async def _fetch_snapshot(self) -> bytes | None:
        url = f"{self.antmedia_url}/WebRTCAppEE/rest/v2/broadcasts/{self.stream_id}/snapshot"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {self.antmedia_token}"},
                )
                if resp.status_code == 200:
                    return resp.content
                logger.warning(f"Snapshot fetch returned {resp.status_code} for {self.camera_id}")
                return None
        except Exception as e:
            logger.warning(f"Snapshot fetch failed for {self.camera_id}: {e}")
            return None

    @property
    def is_degraded(self) -> bool:
        return self._consecutive_failures >= 5
