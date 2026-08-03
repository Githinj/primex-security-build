"""Tests for the detector's per-camera tracker isolation.

The model itself is stubbed — these cover the tracker state that Detector owns,
not ultralytics inference. Nothing here imports ultralytics, torch, or cv2.
"""

from detector import Detector


class _StubPredictor:
    def __init__(self):
        self.trackers = None


class _StubModel:
    """Stands in for ultralytics YOLO, recording how track() was called.

    Mirrors the real contract: a predictor appears after the first track()
    call, and `persist=False` rebuilds the tracker list while `persist=True`
    leaves whatever is already on the predictor alone.
    """

    names = {0: "person"}

    def __init__(self):
        self.predictor = None
        self.calls: list[dict] = []
        self._built = 0

    def track(self, img, persist=False, verbose=False):
        self.calls.append({
            "persist": persist,
            "trackers_at_entry": self.predictor.trackers if self.predictor else None,
        })
        if self.predictor is None:
            self.predictor = _StubPredictor()
        if not persist:
            self._built += 1
            self.predictor.trackers = [f"tracker-{self._built}"]
        return []


def _detector():
    return Detector(model=_StubModel())


def test_first_frame_for_a_camera_builds_fresh_trackers():
    det = _detector()
    det._track("frame", "cam-01")

    assert det.model.calls[0]["persist"] is False
    assert det._trackers["cam-01"] == ["tracker-1"]


def test_second_frame_for_same_camera_persists_its_own_trackers():
    det = _detector()
    det._track("frame", "cam-01")
    det._track("frame", "cam-01")

    assert det.model.calls[1]["persist"] is True
    assert det.model.calls[1]["trackers_at_entry"] == ["tracker-1"]
    assert det._trackers["cam-01"] == ["tracker-1"]


def test_second_camera_does_not_inherit_the_first_cameras_trackers():
    det = _detector()
    det._track("frame", "cam-01")
    det._track("frame", "cam-02")

    # cam-02 is new: fresh trackers, not cam-01's.
    assert det.model.calls[1]["persist"] is False
    assert det._trackers["cam-01"] == ["tracker-1"]
    assert det._trackers["cam-02"] == ["tracker-2"]


def test_interleaved_cameras_each_see_their_own_trackers():
    det = _detector()
    det._track("frame", "cam-01")
    det._track("frame", "cam-02")
    det._track("frame", "cam-01")
    det._track("frame", "cam-02")

    # Third and fourth calls each restore that camera's own state before running.
    assert det.model.calls[2]["trackers_at_entry"] == ["tracker-1"]
    assert det.model.calls[3]["trackers_at_entry"] == ["tracker-2"]
    assert all(c["persist"] for c in det.model.calls[2:])


def test_forget_camera_drops_state_so_the_next_frame_starts_clean():
    det = _detector()
    det._track("frame", "cam-01")
    det.forget_camera("cam-01")

    assert "cam-01" not in det._trackers

    det._track("frame", "cam-01")
    assert det.model.calls[1]["persist"] is False


def test_forget_unknown_camera_is_a_noop():
    det = _detector()
    det.forget_camera("cam-never-seen")


class _Xyxy:
    def __init__(self, values):
        self._values = values

    def tolist(self):
        return list(self._values)


class _StubBox:
    def __init__(self, cls_id, conf, xyxy, track_id=None):
        self.cls = [cls_id]
        self.conf = [conf]
        self.xyxy = [_Xyxy(xyxy)]
        self.id = [track_id] if track_id is not None else None


class _StubResult:
    def __init__(self, boxes):
        self.boxes = boxes


def test_to_detections_maps_boxes_onto_detection():
    det = _detector()
    result = _StubResult([_StubBox(0, 0.91, (10.0, 20.0, 30.0, 40.0), track_id=7)])

    detections = det._to_detections([result])

    assert len(detections) == 1
    assert detections[0].cls == "person"
    assert detections[0].bbox == (10, 20, 30, 40)
    assert detections[0].confidence == 0.91
    assert detections[0].track_id == "7"


def test_to_detections_skips_results_without_boxes():
    det = _detector()
    assert det._to_detections([_StubResult(None)]) == []


def test_to_detections_falls_back_when_tracking_returns_no_id():
    det = _detector()
    result = _StubResult([_StubBox(0, 0.5, (0.0, 0.0, 1.0, 1.0))])

    assert det._to_detections([result])[0].track_id == "notrack_0"
