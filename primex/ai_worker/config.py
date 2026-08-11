"""Loads worker configuration from Supabase ai_worker_config table."""

import os
from dataclasses import dataclass
from supabase import create_client


@dataclass
class WorkerConfig:
    confidence_threshold: float = 0.7
    snapshot_interval_s: int = 2
    cooldown_s: int = 60
    dwell_threshold_s: int = 300
    door_open_threshold_s: int = 120


def load_config(client=None) -> WorkerConfig:
    """Fetch singleton config from ai_worker_config table.

    Accepts an existing Supabase client so the supervisor can re-read this on
    its sync tick (SEC-169) without building a new client every 30 seconds.
    Called with no argument at startup, before a supervisor exists.
    """
    if client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        client = create_client(url, key)

    resp = client.table("ai_worker_config").select("*").eq("id", 1).single().execute()
    row = resp.data
    if not row:
        return WorkerConfig()

    return WorkerConfig(
        confidence_threshold=row["confidence_threshold"],
        snapshot_interval_s=row["snapshot_interval_s"],
        cooldown_s=row["cooldown_s"],
        dwell_threshold_s=row["dwell_threshold_s"],
        door_open_threshold_s=row["door_open_threshold_s"],
    )
