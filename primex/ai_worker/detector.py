"""YOLOv8 model wrapper with async GPU inference queue."""

import asyncio
from dataclasses import dataclass

from behavior_tracker import Detection


@dataclass
class InferenceRequest:
    frame: bytes
    camera_id: str
    future: asyncio.Future


class Detector:
    """One shared model serving every camera, one frame at a time.

    Ultralytics keeps tracker state on the predictor, so a single model fed
    interleaved frames from several cameras tries to associate objects across
    unrelated scenes — re-IDing tracks and resetting the `first_seen` timestamps
    BehaviorTracker builds dwell time from. Each camera therefore gets its own
    tracker state, swapped in around the call. Safe because `start()` serializes
    inference: only one frame is ever in flight.
    """

    def __init__(self, model_path: str = "yolov8n.pt", model=None):
        if model is None:
            # Imported lazily so this module stays importable — and unit
            # testable — without the ultralytics/torch stack installed.
            from ultralytics import YOLO

            model = YOLO(model_path)
        self.model = model
        self._queue: asyncio.Queue[InferenceRequest] = asyncio.Queue()
        self._running = False
        self._trackers: dict[str, object] = {}

    async def start(self):
        self._running = True
        while self._running:
            request = await self._queue.get()
            try:
                detections = await asyncio.to_thread(
                    self._run_inference, request.frame, request.camera_id
                )
                request.future.set_result(detections)
            except Exception as e:
                request.future.set_exception(e)
            finally:
                self._queue.task_done()

    def stop(self):
        self._running = False

    @property
    def queue_depth(self) -> int:
        """Frames waiting on inference. Sustained growth means the model can't
        keep up with the poll interval across the active cameras."""
        return self._queue.qsize()

    def forget_camera(self, camera_id: str) -> None:
        """Drop a stopped camera's tracker state.

        Called by the supervisor when it tears a camera task down, so state
        doesn't accumulate across the 30s sync cycles, and a camera that comes
        back later starts tracking clean rather than resuming stale tracks.
        """
        self._trackers.pop(camera_id, None)

    async def submit(self, frame: bytes, camera_id: str) -> list[Detection]:
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        await self._queue.put(
            InferenceRequest(frame=frame, camera_id=camera_id, future=future)
        )
        return await future

    def _run_inference(self, frame: bytes, camera_id: str) -> list[Detection]:
        img = self._decode(frame)
        if img is None:
            return []
        return self._to_detections(self._track(img, camera_id))

    def _decode(self, frame: bytes):
        import numpy as np
        import cv2

        nparr = np.frombuffer(frame, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    def _track(self, img, camera_id: str):
        saved = self._trackers.get(camera_id)
        predictor = getattr(self.model, "predictor", None)
        if saved is not None and predictor is not None:
            predictor.trackers = saved

        # persist=False on a camera's first frame makes ultralytics build fresh
        # trackers instead of inheriting whichever camera ran last.
        results = self.model.track(img, persist=saved is not None, verbose=False)

        predictor = getattr(self.model, "predictor", None)
        trackers = getattr(predictor, "trackers", None) if predictor is not None else None
        if trackers is not None:
            self._trackers[camera_id] = trackers

        return results

    def _to_detections(self, results) -> list[Detection]:
        detections: list[Detection] = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls_id = int(box.cls[0])
                cls_name = self.model.names[cls_id]
                conf = float(box.conf[0])
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                track_id = str(int(box.id[0])) if box.id is not None else f"notrack_{cls_id}"

                detections.append(Detection(
                    cls=cls_name,
                    bbox=(x1, y1, x2, y2),
                    confidence=conf,
                    track_id=track_id,
                ))

        return detections
