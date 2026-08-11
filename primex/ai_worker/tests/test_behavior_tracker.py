"""Tests for behavior tracker."""

from behavior_tracker import BehaviorTracker, Detection, SecurityEvent


# Detections carry pixel boxes plus the frame they were measured in; zones are
# normalised 0–1. FRAME_W/H is the notional snapshot the pixel boxes below are
# expressed against.
FRAME_W, FRAME_H = 640, 480


def make_person(track_id="p1", x1=100, y1=100, x2=200, y2=400, conf=0.8,
                frame_w=FRAME_W, frame_h=FRAME_H):
    return Detection(cls="person", bbox=(x1, y1, x2, y2), confidence=conf,
                     track_id=track_id, frame_w=frame_w, frame_h=frame_h)


def make_vehicle(track_id="v1", x1=100, y1=100, x2=300, y2=300, conf=0.85,
                 frame_w=FRAME_W, frame_h=FRAME_H):
    return Detection(cls="car", bbox=(x1, y1, x2, y2), confidence=conf,
                     track_id=track_id, frame_w=frame_w, frame_h=frame_h)


ENTRY_ZONE = [{"name": "entry1", "type": "entry", "coords": {"x1": 0.05, "y1": 0.1, "x2": 0.4, "y2": 0.95}}]
RESTRICTED_ZONE = [{"name": "restricted1", "type": "restricted", "coords": {"x1": 0.05, "y1": 0.1, "x2": 0.55, "y2": 0.73}}]
BIZ_HOURS = {"mon": {"open": "08:00", "close": "18:00"}}


def test_no_events_on_empty_detections():
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=300)
    events = tracker.process([], timestamp=1000.0)
    assert events == []


def test_person_lingering_fires_after_dwell():
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=10)
    person = make_person()
    for t in range(10):
        events = tracker.process([person], timestamp=1000.0 + t)
    assert all(e.event_type != "person_lingering" for e in events)
    events = tracker.process([person], timestamp=1011.0)
    types = [e.event_type for e in events]
    assert "person_lingering" in types


def test_afterhours_motion_fires_outside_hours():
    tracker = BehaviorTracker(zones=[], business_hours=BIZ_HOURS, timezone="UTC", dwell_threshold_s=300)
    import datetime
    tue_23 = datetime.datetime(2026, 6, 30, 23, 0, 0).timestamp()
    person = make_person()
    events = tracker.process([person], timestamp=tue_23)
    types = [e.event_type for e in events]
    assert "motion_afterhours" in types


def test_no_afterhours_during_business_hours():
    tracker = BehaviorTracker(zones=[], business_hours=BIZ_HOURS, timezone="UTC", dwell_threshold_s=300)
    import datetime
    mon_10 = datetime.datetime(2026, 6, 29, 10, 0, 0).timestamp()
    person = make_person()
    events = tracker.process([person], timestamp=mon_10)
    types = [e.event_type for e in events]
    assert "motion_afterhours" not in types


def test_vehicle_in_restricted_zone():
    tracker = BehaviorTracker(zones=RESTRICTED_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300)
    vehicle = make_vehicle(x1=100, y1=100, x2=300, y2=300)
    events = tracker.process([vehicle], timestamp=1000.0)
    types = [e.event_type for e in events]
    assert "vehicle_detection" in types


def test_concealment_requires_entry_zone_and_duration():
    tracker = BehaviorTracker(zones=ENTRY_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300)
    crouching = make_person(x1=100, y1=350, x2=250, y2=400)
    events = tracker.process([crouching], timestamp=1000.0)
    types = [e.event_type for e in events]
    assert "concealment_behavior" not in types
    for t in range(1, 32):
        events = tracker.process([crouching], timestamp=1000.0 + t)
    types = [e.event_type for e in events]
    assert "concealment_behavior" in types


def test_door_tracking_is_gone():
    """SEC-166: the door path had no production caller and could not have had
    one — the detector is stock YOLOv8 over COCO, which has no door class. This
    guards against someone re-adding the API without a real sensor behind it."""
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=300)
    assert not hasattr(tracker, "mark_door_open")
    assert not hasattr(tracker, "mark_door_closed")
    assert not hasattr(tracker, "door_open_threshold_s")


def test_zone_matching_is_resolution_independent():
    """The same relative position must resolve to the same zone at any size.

    This is the point of storing zones normalised: a rectangle drawn against a
    640x480 snapshot must still cover the same part of the scene once the camera
    publishes 1280x720.
    """
    tracker = BehaviorTracker(zones=RESTRICTED_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300)

    # Centre at (0.3125, 0.4167) of the frame, expressed at two resolutions.
    small = make_vehicle(track_id="v-small", x1=100, y1=100, x2=300, y2=300, frame_w=640, frame_h=480)
    large = make_vehicle(track_id="v-large", x1=200, y1=150, x2=600, y2=450, frame_w=1280, frame_h=720)

    for vehicle in (small, large):
        events = tracker.process([vehicle], timestamp=1000.0)
        assert "vehicle_detection" in [e.event_type for e in events]


def test_zone_matching_skipped_when_frame_size_unknown():
    """Without frame dimensions a pixel centre can't be placed in a 0–1 zone.

    Skipping beats guessing: comparing raw pixels against fractions would put
    every detection outside every zone anyway, but silently.
    """
    tracker = BehaviorTracker(zones=RESTRICTED_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300)
    vehicle = make_vehicle(x1=100, y1=100, x2=300, y2=300, frame_w=0, frame_h=0)

    events = tracker.process([vehicle], timestamp=1000.0)

    assert "vehicle_detection" not in [e.event_type for e in events]
    assert tracker._tracks["v1"].zone is None


def test_track_pruning_after_disappearance():
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=300)
    person = make_person(track_id="p1")
    tracker.process([person], timestamp=1000.0)
    assert "p1" in tracker._tracks
    tracker.process([], timestamp=1011.0)
    assert "p1" not in tracker._tracks
