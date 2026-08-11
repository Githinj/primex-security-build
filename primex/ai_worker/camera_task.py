"""Per-camera async task loop: poll -> detect -> track -> alert."""

import asyncio
import logging
import time

import httpx

from antmedia_jwt import REST_JWT_TTL_S, rest_jwt_expiry, sign_rest_jwt
from behavior_tracker import BehaviorTracker, Detection
from cooldown import CooldownRegistry
from detector import Detector
from event_poster import EventPoster
from heartbeat import DEFAULT_FAILURE_THRESHOLD, DEFAULT_INTERVAL_S, Heartbeat, HeartbeatState
from stats import WorkerStats

logger = logging.getLogger(__name__)

# Snapshot failures tolerated before the camera counts as not delivering.
# Shared by the /health view (`is_degraded`) and the heartbeat reporter so the
# two can never disagree about what "degraded" means.
FAILURE_THRESHOLD = DEFAULT_FAILURE_THRESHOLD


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
        antmedia_secret: str = "",
        antmedia_app: str = "LiveApp",
        stats: WorkerStats | None = None,
        heartbeat_interval_s: int = DEFAULT_INTERVAL_S,
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
        self.antmedia_secret = antmedia_secret
        self.antmedia_app = antmedia_app
        # Own counters when running standalone; the supervisor passes a shared
        # instance so /health aggregates across every camera.
        self.stats = stats if stats is not None else WorkerStats()
        # Persistent OpenCV capture for the Community-Edition HLS strategy.
        self._hls_cap = None
        self._consecutive_failures = 0
        # Frame-liveness reporting (SEC-204). Decides when to report; the
        # poster does the sending.
        self._heartbeat = HeartbeatState(
            interval_s=heartbeat_interval_s,
            failure_threshold=FAILURE_THRESHOLD,
        )

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
                    if self._consecutive_failures >= FAILURE_THRESHOLD:
                        logger.warning(
                            f"Camera {self.camera_id}: "
                            f"{FAILURE_THRESHOLD}+ consecutive snapshot failures"
                        )
                    await self._report_liveness(self._heartbeat.on_failure(time.time()))
                    await asyncio.sleep(self.snapshot_interval_s)
                    continue

                self._consecutive_failures = 0
                # Before inference, not after: this says "the source delivered a
                # frame", which is true regardless of whether the GPU is healthy.
                await self._report_liveness(self._heartbeat.on_frame(time.time()))

                try:
                    detections = await self.detector.submit(frame, self.camera_id)
                except Exception as e:
                    self.stats.record_gpu_error()
                    logger.error(f"Inference failed for {self.camera_id}: {e}")
                    await asyncio.sleep(self.snapshot_interval_s)
                    continue

                self.stats.record_frame()

                detections = [d for d in detections if d.confidence >= self.confidence_threshold]

                events = self.tracker.process(detections, timestamp=time.time())

                for event in events:
                    if self.cooldown.can_fire(self.camera_id, event.event_type):
                        frame_url = await self.poster.upload_frame(frame, self.camera_id)
                        det_dicts = [
                            {"class": d.cls, "bbox": list(d.bbox), "track_id": d.track_id}
                            for d in detections
                        ]
                        posted = await self.poster.post_event(
                            camera_id=self.camera_id,
                            site_id=self.site_id,
                            event_type=event.event_type,
                            confidence=event.confidence,
                            frame_url=frame_url,
                            detections=det_dicts,
                            metadata=event.metadata,
                        )
                        if posted:
                            self.stats.record_alert()
                        self.cooldown.mark_fired(self.camera_id, event.event_type)

            except asyncio.CancelledError:
                logger.info(f"Camera task cancelled: {self.camera_id}")
                self._release_hls()
                raise
            except Exception as e:
                logger.error(f"Unexpected error in camera task {self.camera_id}: {e}")

            await asyncio.sleep(self.snapshot_interval_s)

    async def _report_liveness(self, beat: Heartbeat | None) -> None:
        """Send a heartbeat if the state machine produced one. Never raises:
        liveness reporting must not be able to kill the detection loop."""
        if beat is None:
            return
        try:
            await self.poster.post_heartbeat(self.camera_id, beat)
        except Exception as e:
            logger.warning(f"Heartbeat failed for {self.camera_id}: {e}")

    async def _fetch_snapshot(self) -> bytes | None:
        """Grab one JPEG frame. Two strategies, mirroring the front-end's
        Enterprise-vs-Community split (src/lib/data/actions/streaming.ts):

        - Enterprise (antmedia_secret set): the REST snapshot API, using the
          configured ANTMEDIA_APP (not a hard-coded WebRTCAppEE path).
        - Community (no secret): the snapshot REST API doesn't exist, so pull a
          frame off the HLS playlist with OpenCV.
        """
        if self.antmedia_secret:
            return await self._fetch_snapshot_rest()
        return await self._fetch_snapshot_hls()

    def _sign_rest_jwt(self) -> str:
        """Mint the per-request JWT Ant Media Enterprise's REST filter expects.

        The format lives in antmedia_jwt.py, which is pinned byte-for-byte
        against the TypeScript signer by a shared golden fixture (SEC-188).
        """
        return sign_rest_jwt(self.antmedia_secret, rest_jwt_expiry(ttl_s=REST_JWT_TTL_S))

    async def _fetch_snapshot_rest(self) -> bytes | None:
        url = f"{self.antmedia_url}/{self.antmedia_app}/rest/v2/broadcasts/{self.stream_id}/snapshot"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    url,
                    headers={"Authorization": self._sign_rest_jwt()},
                )
                if resp.status_code == 200:
                    return resp.content
                logger.warning(f"Snapshot fetch returned {resp.status_code} for {self.camera_id}")
                return None
        except Exception as e:
            logger.warning(f"Snapshot fetch failed for {self.camera_id}: {e}")
            return None

    async def _fetch_snapshot_hls(self) -> bytes | None:
        # OpenCV capture is blocking; keep it off the event loop.
        return await asyncio.to_thread(self._grab_hls_frame)

    def _grab_hls_frame(self) -> bytes | None:
        import cv2

        hls_url = f"{self.antmedia_url}/{self.antmedia_app}/streams/{self.stream_id}.m3u8"
        cap = self._hls_cap
        if cap is None or not cap.isOpened():
            cap = cv2.VideoCapture(hls_url)
            # Keep the buffer shallow so reads stay near the live edge.
            try:
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            except Exception:
                pass
            self._hls_cap = cap

        if not cap.isOpened():
            self._release_hls()
            return None

        ok, frame = cap.read()
        if not ok or frame is None:
            # Stream ended or connection dropped — drop the capture so the next
            # poll reopens it (handles stream restarts).
            self._release_hls()
            return None

        ok, buf = cv2.imencode(".jpg", frame)
        if not ok:
            return None
        return buf.tobytes()

    def _release_hls(self) -> None:
        if self._hls_cap is not None:
            try:
                self._hls_cap.release()
            except Exception:
                pass
            self._hls_cap = None

    @property
    def is_degraded(self) -> bool:
        return self._consecutive_failures >= FAILURE_THRESHOLD
