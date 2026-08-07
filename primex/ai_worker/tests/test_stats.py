"""Tests for the rolling-window counters behind /health."""

import time

import stats as stats_module
from stats import RollingCounter, WorkerStats


def test_counter_starts_empty():
    counter = RollingCounter(window_s=60)
    assert counter.count() == 0
    assert counter.total == 0


def test_counter_counts_events_in_window():
    counter = RollingCounter(window_s=60)
    counter.record()
    counter.record()
    assert counter.count() == 2


def test_counter_drops_events_older_than_the_window(monkeypatch):
    counter = RollingCounter(window_s=60)
    counter.record()
    counter.record()

    future = time.time() + 61
    monkeypatch.setattr(stats_module.time, "time", lambda: future)
    assert counter.count() == 0


def test_counter_keeps_events_inside_the_window(monkeypatch):
    counter = RollingCounter(window_s=60)
    counter.record()

    future = time.time() + 59
    monkeypatch.setattr(stats_module.time, "time", lambda: future)
    assert counter.count() == 1


def test_total_is_cumulative_and_survives_pruning(monkeypatch):
    counter = RollingCounter(window_s=60)
    counter.record()
    counter.record()

    future = time.time() + 61
    monkeypatch.setattr(stats_module.time, "time", lambda: future)

    assert counter.count() == 0
    assert counter.total == 2


def test_pruning_bounds_memory(monkeypatch):
    """An old event must not linger once it falls out of the window."""
    counter = RollingCounter(window_s=60)
    counter.record()

    now = time.time()
    monkeypatch.setattr(stats_module.time, "time", lambda: now + 61)
    counter.record()

    assert counter.count() == 1
    assert len(counter._events) == 1


def test_worker_stats_counters_are_independent():
    stats = WorkerStats()
    stats.record_frame()
    stats.record_frame()
    stats.record_alert()

    assert stats.frames.count() == 2
    assert stats.alerts.count() == 1
    assert stats.gpu_errors.count() == 0


def test_worker_stats_records_gpu_errors():
    stats = WorkerStats()
    stats.record_gpu_error()

    assert stats.gpu_errors.count() == 1
    assert stats.gpu_errors.total == 1


def test_uptime_grows(monkeypatch):
    stats = WorkerStats()
    future = stats.start_time + 120
    monkeypatch.setattr(stats_module.time, "time", lambda: future)

    assert stats.uptime_s() == 120
