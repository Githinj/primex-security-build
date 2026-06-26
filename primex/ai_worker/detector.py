"""YOLOv8 model wrapper with async GPU inference queue."""

import asyncio
from dataclasses import dataclass
from ultralytics import YOLO

from behavior_tracker import Detection


@dataclass
class InferenceRequest:
    frame: bytes
    future: asyncio.Future


class Detector:
    def __init__(self, model_path: str = "yolov8n.pt"):
        self.model = YOLO(model_path)
        self._queue: asyncio.Queue[InferenceRequest] = asyncio.Queue()
        self._running = False

    async def start(self):
        self._running = True
        while self._running:
            request = await self._queue.get()
            try:
                detections = await asyncio.to_thread(self._run_inference, request.frame)
                request.future.set_result(detections)
            except Exception as e:
                request.future.set_exception(e)
            finally:
                self._queue.task_done()

    def stop(self):
        self._running = False

    async def submit(self, frame: bytes) -> list[Detection]:
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        await self._queue.put(InferenceRequest(frame=frame, future=future))
        return await future

    def _run_inference(self, frame: bytes) -> list[Detection]:
        import numpy as np
        import cv2

        nparr = np.frombuffer(frame, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return []

        results = self.model.track(img, persist=True, verbose=False)

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
