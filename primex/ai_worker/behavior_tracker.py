"""Per-camera behavior tracker — dwell, concealment, after-hours, door, vehicle."""

import datetime
from dataclasses import dataclass, field


@dataclass
class Detection:
    cls: str
    bbox: tuple[int, int, int, int]
    confidence: float
    track_id: str


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
        door_open_threshold_s: int = 120,
    ):
        self.zones = zones
        self.business_hours = business_hours
        self.timezone = timezone
        self.dwell_threshold_s = dwell_threshold_s
        self.door_open_threshold_s = door_open_threshold_s
        self._tracks: dict[str, _TrackState] = {}
        self._door_state: dict[str, float] = {}

    def mark_door_open(self, zone_name: str, timestamp: float) -> None:
        if zone_name not in self._door_state:
            self._door_state[zone_name] = timestamp

    def mark_door_closed(self, zone_name: str) -> None:
        self._door_state.pop(zone_name, None)

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

            center_x = (det.bbox[0] + det.bbox[2]) / 2
            center_y = (det.bbox[1] + det.bbox[3]) / 2
            track.zone = self._get_zone(center_x, center_y)

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
                near_entry = self._is_near_zone_type(center_x, center_y, "entry")

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

            if is_vehicle and self._is_near_zone_type(center_x, center_y, "restricted"):
                events.append(SecurityEvent(
                    event_type="vehicle_detection",
                    confidence=det.confidence,
                    track_id=det.track_id,
                    zone=track.zone,
                ))

        # Door events
        for zone_name, open_since in list(self._door_state.items()):
            if timestamp - open_since >= self.door_open_threshold_s:
                events.append(SecurityEvent(
                    event_type="door_event",
                    confidence=1.0,
                    zone=zone_name,
                    metadata={"open_seconds": timestamp - open_since},
                ))

        # Prune disappeared tracks
        to_prune = [
            tid for tid, t in self._tracks.items()
            if tid not in seen_track_ids and timestamp - t.last_seen > PRUNE_TIMEOUT_S
        ]
        for tid in to_prune:
            del self._tracks[tid]

        return events

    def _get_zone(self, x: float, y: float) -> str | None:
        for zone in self.zones:
            c = zone["coords"]
            if c["x1"] <= x <= c["x2"] and c["y1"] <= y <= c["y2"]:
                return zone["name"]
        return None

    def _is_near_zone_type(self, x: float, y: float, zone_type: str) -> bool:
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
