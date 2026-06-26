"""Tests for behavior tracker."""

from behavior_tracker import BehaviorTracker, Detection, SecurityEvent


def make_person(track_id="p1", x1=100, y1=100, x2=200, y2=400, conf=0.8):
    return Detection(cls="person", bbox=(x1, y1, x2, y2), confidence=conf, track_id=track_id)


def make_vehicle(track_id="v1", x1=100, y1=100, x2=300, y2=300, conf=0.85):
    return Detection(cls="car", bbox=(x1, y1, x2, y2), confidence=conf, track_id=track_id)


ENTRY_ZONE = [{"name": "entry1", "type": "entry", "coords": {"x1": 50, "y1": 50, "x2": 250, "y2": 450}}]
RESTRICTED_ZONE = [{"name": "restricted1", "type": "restricted", "coords": {"x1": 50, "y1": 50, "x2": 350, "y2": 350}}]
DOOR_ZONE = [{"name": "door1", "type": "door", "coords": {"x1": 100, "y1": 100, "x2": 300, "y2": 400}}]
BIZ_HOURS = {"mon": {"open": "08:00", "close": "18:00"}}


def test_no_events_on_empty_detections():
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    events = tracker.process([], timestamp=1000.0)
    assert events == []


def test_person_lingering_fires_after_dwell():
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=10, door_open_threshold_s=120)
    person = make_person()
    for t in range(10):
        events = tracker.process([person], timestamp=1000.0 + t)
    assert all(e.event_type != "person_lingering" for e in events)
    events = tracker.process([person], timestamp=1011.0)
    types = [e.event_type for e in events]
    assert "person_lingering" in types


def test_afterhours_motion_fires_outside_hours():
    tracker = BehaviorTracker(zones=[], business_hours=BIZ_HOURS, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    import datetime
    tue_23 = datetime.datetime(2026, 6, 30, 23, 0, 0).timestamp()
    person = make_person()
    events = tracker.process([person], timestamp=tue_23)
    types = [e.event_type for e in events]
    assert "motion_afterhours" in types


def test_no_afterhours_during_business_hours():
    tracker = BehaviorTracker(zones=[], business_hours=BIZ_HOURS, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    import datetime
    mon_10 = datetime.datetime(2026, 6, 29, 10, 0, 0).timestamp()
    person = make_person()
    events = tracker.process([person], timestamp=mon_10)
    types = [e.event_type for e in events]
    assert "motion_afterhours" not in types


def test_vehicle_in_restricted_zone():
    tracker = BehaviorTracker(zones=RESTRICTED_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    vehicle = make_vehicle(x1=100, y1=100, x2=300, y2=300)
    events = tracker.process([vehicle], timestamp=1000.0)
    types = [e.event_type for e in events]
    assert "vehicle_detection" in types


def test_concealment_requires_entry_zone_and_duration():
    tracker = BehaviorTracker(zones=ENTRY_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    crouching = make_person(x1=100, y1=350, x2=250, y2=400)
    events = tracker.process([crouching], timestamp=1000.0)
    types = [e.event_type for e in events]
    assert "concealment_behavior" not in types
    for t in range(1, 32):
        events = tracker.process([crouching], timestamp=1000.0 + t)
    types = [e.event_type for e in events]
    assert "concealment_behavior" in types


def test_door_event_fires_after_threshold():
    tracker = BehaviorTracker(zones=DOOR_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=5)
    tracker.mark_door_open("door1", timestamp=1000.0)
    events = tracker.process([], timestamp=1004.0)
    types = [e.event_type for e in events]
    assert "door_event" not in types
    events = tracker.process([], timestamp=1006.0)
    types = [e.event_type for e in events]
    assert "door_event" in types


def test_track_pruning_after_disappearance():
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    person = make_person(track_id="p1")
    tracker.process([person], timestamp=1000.0)
    assert "p1" in tracker._tracks
    tracker.process([], timestamp=1011.0)
    assert "p1" not in tracker._tracks
