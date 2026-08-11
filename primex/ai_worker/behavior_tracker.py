"""Per-camera behavior tracker — dwell, concealment, after-hours, vehicle.

No door tracking (SEC-166). `mark_door_open`/`mark_door_closed`, the
`_door_state` dict and the `door_open_threshold_s` knob existed here but had no
production caller, and could not have had one: the detector is stock YOLOv8 over
the COCO classes, which contain no door. The `detection_event_type` enum value
and the edge function's "Door left open" mapping are intentionally left in the
database, so wiring a real contact sensor later is additive.
"""

import datetime
from dataclasses import dataclass, field


@dataclass
class Detection:
    cls: str
    bbox: tuple[int, int, int, int]
    confidence: float
    track_id: str
    # Dimensions of the frame `bbox` was measured in. Zones are stored as
    # normalised 0–1 coordinates, so the tracker needs these to place a
    # detection inside one. Zero means unknown, and zone matching is skipped
    # rather than guessed at.
    frame_w: int = 0
    frame_h: int = 0


@dataclass
class SecurityEvent:
    event_type: str
    confidence: float
    track_id: str | None = None
    zone: str | None = None
    metadata: dict = field(default_factory=dict)


@dataclass
class _TrackState:
    cls: str
    first_seen: float
    last_seen: float
    bbox: tuple[int, int, int, int]
    zone: str | None = None
    crouching_since: float | None = None


PERSON_CLASSES = {"person"}
VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle"}
PRUNE_TIMEOUT_S = 10


class BehaviorTracker:
    def __init__(
        self,
        zones: list[dict],
        business_hours: dict,
        timezone: str = "UTC",
        dwell_threshold_s: int = 300,
    ):
        self.zones = zones
        self.business_hours = business_hours
        self.timezone = timezone
        self.dwell_threshold_s = dwell_threshold_s
        self._tracks: dict[str, _TrackState] = {}

    def process(self, detections: list[Detection], timestamp: float) -> list[SecurityEvent]:
        events: list[SecurityEvent] = []
        seen_track_ids: set[str] = set()

        for det in detections:
            seen_track_ids.add(det.track_id)
            is_person = det.cls in PERSON_CLASSES
            is_vehicle = det.cls in VEHICLE_CLASSES

            if det.track_id in self._tracks:
                track = self._tracks[det.track_id]
                track.last_seen = timestamp
                track.bbox = det.bbox
            else:
                track = _TrackState(
                    cls=det.cls,
                    first_seen=timestamp,
                    last_seen=timestamp,
                    bbox=det.bbox,
                )
                self._tracks[det.track_id] = track

            point = self._normalize(det)
            track.zone = self._get_zone(point)

            if (is_person or is_vehicle) and self._is_after_hours(timestamp):
                events.append(SecurityEvent(
                    event_type="motion_afterhours",
                    confidence=det.confidence,
                    track_id=det.track_id,
                    metadata={"business_hours_active": False},
                ))

            if is_person:
                dwell = timestamp - track.first_seen
                if dwell >= self.dwell_threshold_s:
                    events.append(SecurityEvent(
                        event_type="person_lingering",
                        confidence=det.confidence,
                        track_id=det.track_id,
                        zone=track.zone,
                        metadata={"dwell_seconds": dwell},
                    ))

            if is_person:
                w = det.bbox[2] - det.bbox[0]
                h = det.bbox[3] - det.bbox[1]
                aspect_ratio = h / w if w > 0 else 1.0
                is_crouching = aspect_ratio < 0.4
                near_entry = self._is_near_zone_type(point, "entry")

                if is_crouching and near_entry:
                    if track.crouching_since is None:
                        track.crouching_since = timestamp
                    elif timestamp - track.crouching_since >= 30:
                        events.append(SecurityEvent(
                            event_type="concealment_behavior",
                            confidence=det.confidence,
                            track_id=det.track_id,
                            zone=track.zone,
                        ))
                else:
                    track.crouching_since = None

            if is_vehicle and self._is_near_zone_type(point, "restricted"):
                events.append(SecurityEvent(
                    event_type="vehicle_detection",
                    confidence=det.confidence,
                    track_id=det.track_id,
                    zone=track.zone,
                ))

        # Prune disappeared tracks
        to_prune = [
            tid for tid, t in self._tracks.items()
            if tid not in seen_track_ids and timestamp - t.last_seen > PRUNE_TIMEOUT_S
        ]
        for tid in to_prune:
            del self._tracks[tid]

        return events

    @staticmethod
    def _normalize(det: Detection) -> tuple[float, float] | None:
        """Centre of a detection in 0–1 frame coordinates.

        Zones are stored normalised so they survive a change in stream
        resolution — a pixel rectangle drawn against a 640x480 snapshot silently
        covers the wrong part of the scene once the camera publishes 1280x720.
        Returns None when the frame size is unknown, so callers skip zone
        matching instead of comparing pixels against fractions.
        """
        if det.frame_w <= 0 or det.frame_h <= 0:
            return None
        center_x = (det.bbox[0] + det.bbox[2]) / 2 / det.frame_w
        center_y = (det.bbox[1] + det.bbox[3]) / 2 / det.frame_h
        return center_x, center_y

    def _get_zone(self, point: tuple[float, float] | None) -> str | None:
        if point is None:
            return None
        x, y = point
        for zone in self.zones:
            c = zone["coords"]
            if c["x1"] <= x <= c["x2"] and c["y1"] <= y <= c["y2"]:
                return zone["name"]
        return None

    def _is_near_zone_type(self, point: tuple[float, float] | None, zone_type: str) -> bool:
        if point is None:
            return False
        x, y = point
        for zone in self.zones:
            if zone["type"] != zone_type:
                continue
            c = zone["coords"]
            if c["x1"] <= x <= c["x2"] and c["y1"] <= y <= c["y2"]:
                return True
        return False

    def _is_after_hours(self, timestamp: float) -> bool:
        if not self.business_hours:
            return False
        try:
            import zoneinfo
            tz = zoneinfo.ZoneInfo(self.timezone)
        except Exception:
            tz = datetime.timezone.utc

        dt = datetime.datetime.fromtimestamp(timestamp, tz=tz)
        day_name = dt.strftime("%a").lower()

        if day_name not in self.business_hours:
            return True

        hours = self.business_hours[day_name]
        open_time = datetime.time.fromisoformat(hours["open"])
        close_time = datetime.time.fromisoformat(hours["close"])
        current_time = dt.time()

        return current_time < open_time or current_time >= close_time
