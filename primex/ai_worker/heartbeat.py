"""Frame-liveness heartbeat state.

`cameras.last_frame_at` used to be written only from Ant Media's
`liveStreamStarted` and `liveStreamStatus` hooks — both of which mean "AMS said
something", not "we saw video". The worker holds the ground truth and threw it
away (SEC-204).

This module is the decision half, kept pure so it can be tested without a
network: it answers *when* to send a heartbeat, never sends one. Two rules,
both there to keep the write volume sane without losing the signal:

- **Successes are throttled.** At the default `snapshot_interval_s` of 2 a
  camera produces 30 frames a minute; writing each one would be 30 updates a
  minute per camera to say the same thing. One write per `interval_s` carries
  the same information.
- **Transitions are not.** Falling into or climbing out of degradation is the
  interesting moment, so it is reported immediately regardless of the throttle.

Deliberately absent: any notion of `cameras.status`. That column already has
two writers (the AMS webhook and the reconcile cron) and a third with its own
idea of "up" would let them fight. This reports what the worker saw; deciding
what that means about status belongs to the reconciler.
"""

from dataclasses import dataclass


DEFAULT_INTERVAL_S = 30
DEFAULT_FAILURE_THRESHOLD = 5


@dataclass(frozen=True)
class Heartbeat:
    """One report worth sending. `observed_at` is a unix timestamp.

    `transition` separates a state change from a routine tick. Without it the
    receiver cannot tell the two apart — every throttled beat carries a
    `degraded` value too — and logging all of them would put a row on the
    camera timeline every `interval_s` forever.
    """

    observed_at: float
    degraded: bool
    consecutive_failures: int
    transition: bool


class HeartbeatState:
    def __init__(
        self,
        interval_s: int = DEFAULT_INTERVAL_S,
        failure_threshold: int = DEFAULT_FAILURE_THRESHOLD,
    ):
        self.interval_s = interval_s
        self.failure_threshold = failure_threshold
        self._consecutive_failures = 0
        self._degraded = False
        self._last_sent_at: float | None = None

    @property
    def degraded(self) -> bool:
        return self._degraded

    def on_frame(self, now: float) -> Heartbeat | None:
        """A snapshot succeeded. Returns a report to send, or None if throttled."""
        recovered = self._degraded
        self._consecutive_failures = 0
        self._degraded = False

        # A recovery is a transition, so it jumps the throttle queue.
        if recovered or self._due(now):
            return self._emit(now, transition=recovered)
        return None

    def on_failure(self, now: float) -> Heartbeat | None:
        """A snapshot failed. Returns a report only on the *transition* into
        degradation — repeating it every interval would turn a dead camera into
        a write loop, and staleness of `last_frame_at` already carries that."""
        self._consecutive_failures += 1

        if not self._degraded and self._consecutive_failures >= self.failure_threshold:
            self._degraded = True
            return self._emit(now, transition=True)
        return None

    def _due(self, now: float) -> bool:
        return self._last_sent_at is None or (now - self._last_sent_at) >= self.interval_s

    def _emit(self, now: float, transition: bool) -> Heartbeat:
        self._last_sent_at = now
        return Heartbeat(
            observed_at=now,
            degraded=self._degraded,
            consecutive_failures=self._consecutive_failures,
            transition=transition,
        )
