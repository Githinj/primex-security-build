"""Tests for cooldown registry."""

import time
from cooldown import CooldownRegistry


def test_can_fire_when_never_fired():
    registry = CooldownRegistry(cooldown_s=60)
    assert registry.can_fire("cam-01", "person_lingering") is True


def test_cannot_fire_within_cooldown():
    registry = CooldownRegistry(cooldown_s=60)
    registry.mark_fired("cam-01", "person_lingering")
    assert registry.can_fire("cam-01", "person_lingering") is False


def test_can_fire_after_cooldown_expires(monkeypatch):
    registry = CooldownRegistry(cooldown_s=1)
    registry.mark_fired("cam-01", "person_lingering")
    future = time.time() + 2
    monkeypatch.setattr(time, "time", lambda: future)
    assert registry.can_fire("cam-01", "person_lingering") is True


def test_different_event_types_independent():
    registry = CooldownRegistry(cooldown_s=60)
    registry.mark_fired("cam-01", "person_lingering")
    assert registry.can_fire("cam-01", "motion_afterhours") is True


def test_different_cameras_independent():
    registry = CooldownRegistry(cooldown_s=60)
    registry.mark_fired("cam-01", "person_lingering")
    assert registry.can_fire("cam-02", "person_lingering") is True
