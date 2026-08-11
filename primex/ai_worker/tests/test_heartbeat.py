from heartbeat import Heartbeat, HeartbeatState


def test_first_frame_reports_immediately():
    state = HeartbeatState(interval_s=30)
    beat = state.on_frame(now=1000.0)
    assert beat == Heartbeat(
        observed_at=1000.0, degraded=False, consecutive_failures=0, transition=False
    )


def test_routine_beats_are_not_transitions():
    """The receiver logs a timeline row per transition, so a steady stream of
    healthy beats must not look like state changes."""
    state = HeartbeatState(interval_s=30)
    first = state.on_frame(now=1000.0)
    second = state.on_frame(now=1030.0)

    assert first.transition is False
    assert second.transition is False


def test_successes_inside_the_interval_are_throttled():
    state = HeartbeatState(interval_s=30)
    state.on_frame(now=1000.0)

    assert state.on_frame(now=1002.0) is None
    assert state.on_frame(now=1029.9) is None
    # Exactly at the boundary counts as due.
    assert state.on_frame(now=1030.0) is not None


def test_throttle_window_restarts_from_the_last_send_not_the_last_frame():
    state = HeartbeatState(interval_s=30)
    state.on_frame(now=1000.0)
    state.on_frame(now=1020.0)  # throttled, must not reset the window
    assert state.on_frame(now=1030.0) is not None


def test_degradation_is_reported_once_on_the_threshold():
    state = HeartbeatState(interval_s=30, failure_threshold=5)

    for i in range(4):
        assert state.on_failure(now=1000.0 + i) is None
    assert not state.degraded

    beat = state.on_failure(now=1004.0)
    assert beat is not None
    assert beat.degraded is True
    assert beat.consecutive_failures == 5
    assert beat.transition is True
    assert state.degraded


def test_continued_failure_does_not_re_report():
    """A dead camera must not become a write loop — staleness of last_frame_at
    already carries 'still dead'."""
    state = HeartbeatState(interval_s=30, failure_threshold=5)
    for i in range(5):
        state.on_failure(now=1000.0 + i)

    for i in range(20):
        assert state.on_failure(now=1100.0 + i) is None


def test_recovery_jumps_the_throttle():
    state = HeartbeatState(interval_s=30, failure_threshold=5)
    state.on_frame(now=1000.0)
    for i in range(5):
        state.on_failure(now=1001.0 + i)

    # Well inside the throttle window, but a transition out of degradation.
    beat = state.on_frame(now=1010.0)
    assert beat is not None
    assert beat.degraded is False
    assert beat.consecutive_failures == 0
    assert beat.transition is True
    assert not state.degraded


def test_a_success_below_the_threshold_clears_the_failure_run():
    state = HeartbeatState(interval_s=30, failure_threshold=5)
    for i in range(4):
        state.on_failure(now=1000.0 + i)

    state.on_frame(now=1004.0)

    # The run restarted, so four more failures still must not trip it.
    for i in range(4):
        assert state.on_failure(now=1005.0 + i) is None
    assert not state.degraded
