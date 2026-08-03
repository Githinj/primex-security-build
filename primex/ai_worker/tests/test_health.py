"""Tests for the supervisor's health payload.

Supervisor instances are built with object.__new__ so no Supabase client is
constructed and no model is loaded — get_health() only reads plain attributes.
Importing supervisor still needs the full dependency set (supabase, httpx,
boto3), so these run under requirements-dev.txt or inside the worker image.
"""

import time

from stats import WorkerStats
from supervisor import SYNC_STALE_AFTER_S, Supervisor


class _StubCameraTask:
    def __init__(self, degraded: bool = False):
        self.is_degraded = degraded


class _StubDetector:
    queue_depth = 0


def _supervisor(cameras=None, sync_age_s: float | None = 0):
    sup = object.__new__(Supervisor)
    sup.stats = WorkerStats()
    sup.detector = _StubDetector()
    sup._camera_tasks = dict(cameras or {})
    sup._tasks = {cam_id: None for cam_id in sup._camera_tasks}
    sup._last_sync_at = None if sync_age_s is None else time.time() - sync_age_s
    return sup


def test_idle_worker_with_no_cameras_is_healthy():
    """Zero cameras is a legitimate configuration, not a fault."""
    health = _supervisor().get_health()

    assert health["status"] == "healthy"
    assert health["active_cameras"] == 0
    assert health["degraded_cameras"] == []


def test_all_cameras_working_is_healthy():
    health = _supervisor({
        "cam-01": _StubCameraTask(),
        "cam-02": _StubCameraTask(),
    }).get_health()

    assert health["status"] == "healthy"
    assert health["active_cameras"] == 2
    assert health["degraded_cameras"] == []


def test_some_cameras_degraded_still_reports_healthy_but_names_them():
    health = _supervisor({
        "cam-01": _StubCameraTask(degraded=True),
        "cam-02": _StubCameraTask(),
    }).get_health()

    assert health["status"] == "healthy"
    assert health["degraded_cameras"] == ["cam-01"]


def test_every_camera_degraded_is_degraded():
    health = _supervisor({
        "cam-01": _StubCameraTask(degraded=True),
        "cam-02": _StubCameraTask(degraded=True),
    }).get_health()

    assert health["status"] == "degraded"
    assert health["degraded_cameras"] == ["cam-01", "cam-02"]


def test_degraded_cameras_are_sorted():
    health = _supervisor({
        "cam-02": _StubCameraTask(degraded=True),
        "cam-01": _StubCameraTask(degraded=True),
    }).get_health()

    assert health["degraded_cameras"] == ["cam-01", "cam-02"]


def test_never_synced_is_degraded():
    health = _supervisor(sync_age_s=None).get_health()

    assert health["status"] == "degraded"
    assert health["sync_age_s"] is None


def test_stale_sync_is_degraded_even_with_working_cameras():
    """A wedged supervisor means the camera roster can't be trusted."""
    health = _supervisor(
        {"cam-01": _StubCameraTask()},
        sync_age_s=SYNC_STALE_AFTER_S + 5,
    ).get_health()

    assert health["status"] == "degraded"
    assert health["sync_age_s"] > SYNC_STALE_AFTER_S


def test_recent_sync_is_not_stale():
    health = _supervisor(sync_age_s=SYNC_STALE_AFTER_S - 5).get_health()

    assert health["status"] == "healthy"


def test_counters_are_surfaced_from_stats():
    sup = _supervisor()
    sup.stats.record_frame()
    sup.stats.record_frame()
    sup.stats.record_alert()
    sup.stats.record_gpu_error()

    health = sup.get_health()

    assert health["frames_processed_last_min"] == 2
    assert health["alerts_fired_last_min"] == 1
    assert health["gpu_errors_last_min"] == 1
    assert health["gpu_errors_total"] == 1


def test_queue_depth_is_surfaced():
    assert _supervisor().get_health()["inference_queue_depth"] == 0
