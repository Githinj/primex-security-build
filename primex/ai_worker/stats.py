"""Rolling-window counters behind the worker's /health endpoint."""

import time
from collections import deque

WINDOW_S = 60


class RollingCounter:
    """Counts events within a trailing time window.

    Entries are pruned lazily on read and write, so an idle counter costs
    nothing and a busy one stays bounded by its window rather than growing
    for the life of the process.
    """

    def __init__(self, window_s: int = WINDOW_S):
        self.window_s = window_s
        self.total = 0
        self._events: deque[float] = deque()

    def record(self) -> None:
        now = time.time()
        self.total += 1
        self._events.append(now)
        self._prune(now)

    def count(self) -> int:
        self._prune(time.time())
        return len(self._events)

    def _prune(self, now: float) -> None:
        cutoff = now - self.window_s
        while self._events and self._events[0] <= cutoff:
            self._events.popleft()


class WorkerStats:
    """Shared by the supervisor and every camera task."""

    def __init__(self, window_s: int = WINDOW_S):
        self.start_time = time.time()
        self.frames = RollingCounter(window_s)
        self.alerts = RollingCounter(window_s)
        self.gpu_errors = RollingCounter(window_s)

    def record_frame(self) -> None:
        self.frames.record()

    def record_alert(self) -> None:
        self.alerts.record()

    def record_gpu_error(self) -> None:
        self.gpu_errors.record()

    def uptime_s(self) -> int:
        return int(time.time() - self.start_time)
