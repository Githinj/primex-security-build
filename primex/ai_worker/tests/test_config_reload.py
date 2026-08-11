"""Supervisor config reload (SEC-169).

These drive `_refresh_config` directly rather than standing a Supervisor up:
`Supervisor.__init__` builds a Detector, an EventPoster and a Supabase client,
all of which need credentials and none of which are what is under test.
"""

import types

import pytest

from config import WorkerConfig


class FakeTask:
    def __init__(self):
        self.cancelled = False

    def cancel(self):
        self.cancelled = True


def make_supervisor(current: WorkerConfig, loader, cooldown_s=60):
    """A stand-in carrying only the state `_refresh_config` touches."""
    from supervisor import Supervisor

    sup = object.__new__(Supervisor)
    sup.config = current
    sup.cooldown = types.SimpleNamespace(cooldown_s=cooldown_s)
    sup._supabase = object()
    sup._tasks = {}
    sup._camera_tasks = {}

    # Patch the module-level loader the method calls.
    import supervisor as supervisor_module

    supervisor_module.load_config = loader
    return sup


DEFAULTS = WorkerConfig()


def test_unchanged_config_leaves_tasks_running():
    sup = make_supervisor(DEFAULTS, lambda client: WorkerConfig())
    task = FakeTask()
    sup._tasks = {"cam-1": task}
    sup._camera_tasks = {"cam-1": object()}

    sup._refresh_config()

    assert not task.cancelled
    assert "cam-1" in sup._tasks


def test_changed_config_is_applied_and_tasks_are_recreated():
    changed = WorkerConfig(confidence_threshold=0.5, snapshot_interval_s=5)
    sup = make_supervisor(DEFAULTS, lambda client: changed)
    task = FakeTask()
    sup._tasks = {"cam-1": task}
    sup._camera_tasks = {"cam-1": object()}

    sup._refresh_config()

    assert sup.config == changed
    assert task.cancelled
    # Cleared, so _sync_cameras rebuilds them with the new thresholds.
    assert sup._tasks == {}
    assert sup._camera_tasks == {}


def test_cooldown_window_is_updated_without_recreating_the_registry():
    changed = WorkerConfig(cooldown_s=120)
    sup = make_supervisor(DEFAULTS, lambda client: changed, cooldown_s=60)

    sup._refresh_config()

    assert sup.cooldown.cooldown_s == 120


def test_a_failed_read_keeps_the_current_config():
    """A Supabase blip must not silently reset a tuned worker to defaults."""
    tuned = WorkerConfig(confidence_threshold=0.4, cooldown_s=900)

    def boom(client):
        raise RuntimeError("supabase unreachable")

    sup = make_supervisor(tuned, boom)
    task = FakeTask()
    sup._tasks = {"cam-1": task}

    sup._refresh_config()

    assert sup.config == tuned
    assert not task.cancelled


def test_reload_reuses_the_supervisors_client():
    """Building a fresh Supabase client every 30s per worker would be waste."""
    seen = []

    def loader(client):
        seen.append(client)
        return WorkerConfig()

    sup = make_supervisor(DEFAULTS, loader)
    sup._refresh_config()

    assert seen == [sup._supabase]


@pytest.fixture(autouse=True)
def restore_loader():
    """Each test rebinds supervisor.load_config; put the real one back."""
    import supervisor as supervisor_module

    original = supervisor_module.load_config
    yield
    supervisor_module.load_config = original
