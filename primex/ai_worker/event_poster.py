"""Uploads frames to DO Spaces and posts events to the Edge Function."""

import os
import json
import logging
from datetime import datetime, timezone

import httpx
import boto3

logger = logging.getLogger(__name__)

MISSED_EVENTS_FILE = "missed_events.jsonl"


class EventPoster:
    def __init__(self):
        self.edge_fn_url = os.environ["SUPABASE_URL"] + "/functions/v1/ai-event-ingest"
        self.worker_secret = os.environ["AI_WORKER_SECRET"]

        self.s3 = boto3.client(
            "s3",
            endpoint_url=os.environ["DO_SPACES_ENDPOINT"],
            aws_access_key_id=os.environ["DO_SPACES_KEY"],
            aws_secret_access_key=os.environ["DO_SPACES_SECRET"],
        )
        self.bucket = os.environ["DO_SPACES_BUCKET"]

    async def upload_frame(self, frame: bytes, camera_id: str) -> str | None:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
        key = f"frames/{camera_id}/{ts}.jpg"
        try:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=frame,
                ContentType="image/jpeg",
                ACL="public-read",
            )
            return f"{os.environ['DO_SPACES_ENDPOINT']}/{self.bucket}/{key}"
        except Exception as e:
            logger.warning(f"Frame upload failed for {camera_id}: {e}")
            return None

    async def post_event(
        self,
        camera_id: str,
        site_id: str,
        event_type: str,
        confidence: float,
        frame_url: str | None,
        detections: list[dict],
        metadata: dict,
    ) -> bool:
        payload = {
            "camera_id": camera_id,
            "site_id": site_id,
            "event_type": event_type,
            "confidence": confidence,
            "frame_url": frame_url,
            "detections": detections,
            "metadata": metadata,
        }

        backoff = [1, 2, 4]
        async with httpx.AsyncClient(timeout=10) as client:
            for attempt, delay in enumerate(backoff):
                try:
                    resp = await client.post(
                        self.edge_fn_url,
                        json=payload,
                        headers={"Authorization": f"Bearer {self.worker_secret}"},
                    )
                    if resp.status_code == 201:
                        return True
                    logger.warning(f"Edge Function returned {resp.status_code}: {resp.text}")
                except Exception as e:
                    logger.warning(f"POST attempt {attempt + 1} failed: {e}")

                if attempt < len(backoff) - 1:
                    import asyncio
                    await asyncio.sleep(delay)

        logger.error(f"Failed to post event after 3 retries: {event_type} for {camera_id}")
        self._log_missed_event(payload)
        return False

    def _log_missed_event(self, payload: dict) -> None:
        try:
            with open(MISSED_EVENTS_FILE, "a") as f:
                f.write(json.dumps(payload) + "\n")
        except Exception as e:
            logger.error(f"Failed to write missed event: {e}")
