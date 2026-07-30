"""Per-camera async task loop: poll -> detect -> track -> alert."""

import asyncio
import base64
import hmac
import hashlib
import json
import logging
import time

import httpx

from behavior_tracker import BehaviorTracker, Detection
from cooldown import CooldownRegistry
from detector import Detector
from event_poster import EventPoster

logger = logging.getLogger(__name__)

REST_JWT_TTL_S = 60  # short-lived: a fresh token is signed per request


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
        # Persistent OpenCV capture for the Community-Edition HLS strategy.
        self._hls_cap = None
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
                self._release_hls()
                raise
            except Exception as e:
                logger.error(f"Unexpected error in camera task {self.camera_id}: {e}")

            await asyncio.sleep(self.snapshot_interval_s)

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

        ANTMEDIA_API_KEY is the shared HS256 signing secret (AMS `jwtSecretKey`),
        not a token — sending it verbatim gets a 403 "Invalid App JWT Token".
        Must stay in step with signAntmediaRestJwt() in
        src/lib/data/actions/streaming.ts: same claims, raw value, no "Bearer ".
        """

        def b64url(raw: bytes) -> str:
            return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

        # Compact separators so this serializes byte-identically to the TS side's
        # JSON.stringify — keeps the two runtimes emitting the same token.
        def compact(obj: dict) -> bytes:
            return json.dumps(obj, separators=(",", ":")).encode()

        header = b64url(compact({"alg": "HS256", "typ": "JWT"}))
        payload = b64url(compact({"exp": int(time.time()) + REST_JWT_TTL_S}))
        signing_input = f"{header}.{payload}".encode("ascii")
        signature = b64url(
            hmac.new(self.antmedia_secret.encode(), signing_input, hashlib.sha256).digest()
        )
        return f"{header}.{payload}.{signature}"

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
        return self._consecutive_failures >= 5
