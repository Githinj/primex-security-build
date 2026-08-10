"""Replay missed events from missed_events.jsonl to the Edge Function.

Usage: python replay_missed.py [--file missed_events.jsonl]
"""

import argparse
import json
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()


def main():
    parser = argparse.ArgumentParser(description="Replay missed AI detection events")
    parser.add_argument(
        "--file",
        default=os.environ.get("MISSED_EVENTS_FILE", "missed_events.jsonl"),
        help="Path to missed events JSONL file (default: $MISSED_EVENTS_FILE)",
    )
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"No missed events file found: {args.file}")
        return

    edge_url = os.environ["SUPABASE_URL"] + "/functions/v1/ai-event-ingest"
    secret = os.environ["AI_WORKER_SECRET"]

    with open(args.file) as f:
        lines = f.readlines()

    print(f"Replaying {len(lines)} missed events...")
    success = 0
    failed = 0

    with httpx.Client(timeout=10) as client:
        for i, line in enumerate(lines, 1):
            payload = json.loads(line.strip())
            try:
                resp = client.post(
                    edge_url,
                    json=payload,
                    headers={"Authorization": f"Bearer {secret}"},
                )
                if resp.status_code == 201:
                    success += 1
                else:
                    print(f"  [{i}] FAILED ({resp.status_code}): {resp.text[:100]}")
                    failed += 1
            except Exception as e:
                print(f"  [{i}] ERROR: {e}")
                failed += 1

    print(f"Done. Success: {success}, Failed: {failed}")
    if failed == 0 and success > 0:
        os.rename(args.file, args.file + ".replayed")
        print(f"Renamed {args.file} -> {args.file}.replayed")


if __name__ == "__main__":
    main()
