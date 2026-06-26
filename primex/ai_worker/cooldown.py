"""Per camera+event_type cooldown registry."""

import time


class CooldownRegistry:
    def __init__(self, cooldown_s: int = 60):
        self.cooldown_s = cooldown_s
        self._last_fired: dict[tuple[str, str], float] = {}

    def can_fire(self, camera_id: str, event_type: str) -> bool:
        key = (camera_id, event_type)
        last = self._last_fired.get(key)
        if last is None:
            return True
        return time.time() - last >= self.cooldown_s

    def mark_fired(self, camera_id: str, event_type: str) -> None:
        self._last_fired[(camera_id, event_type)] = time.time()
