"""Cross-runtime pin for the Ant Media REST JWT (SEC-188).

The same token format is implemented in TypeScript (src/lib/streaming/rest-jwt.ts)
and here. Both suites assert the same fixture, so a drift on either side fails a
test instead of failing Enterprise auth in production with a 403 that looks like
the IP-allowlist problem in the deploy notes.
"""

import base64
import json
from pathlib import Path

import pytest

from antmedia_jwt import REST_JWT_TTL_S, rest_jwt_expiry, sign_rest_jwt

# ai_worker/tests/ -> ai_worker/ -> primex/
FIXTURE = Path(__file__).resolve().parents[2] / "fixtures" / "antmedia-rest-jwt.json"


@pytest.fixture(scope="module")
def golden() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_matches_the_golden_fixture_the_typescript_side_asserts(golden):
    """If this fails, do NOT recompute the fixture. Find which side changed."""
    assert sign_rest_jwt(golden["secret"], golden["exp"]) == golden["token"]


def test_serializes_without_spaces(golden):
    """json.dumps defaults to ", " / ": "; JavaScript emits neither.

    A single space changes the base64 and every signature with it, and it is the
    most likely way these two implementations drift.
    """
    header, payload, _ = sign_rest_jwt(golden["secret"], golden["exp"]).split(".")
    raw = base64.urlsafe_b64decode(header + "=" * (-len(header) % 4)).decode()
    assert " " not in raw


def test_encodes_exactly_the_two_claims_ams_checks(golden):
    header, payload, _ = sign_rest_jwt(golden["secret"], golden["exp"]).split(".")

    def decode(part: str) -> dict:
        return json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))

    assert decode(header) == {"alg": "HS256", "typ": "JWT"}
    assert decode(payload) == {"exp": golden["exp"]}


def test_segments_are_unpadded_base64url(golden):
    for part in sign_rest_jwt(golden["secret"], golden["exp"]).split("."):
        assert "=" not in part
        assert "+" not in part and "/" not in part


def test_signature_depends_on_the_secret(golden):
    assert sign_rest_jwt("a", golden["exp"]) != sign_rest_jwt("b", golden["exp"])


def test_expiry_adds_the_ttl_to_the_given_clock():
    assert rest_jwt_expiry(1_760_000_000, 60) == 1_760_000_060


def test_expiry_defaults_to_the_shared_ttl():
    assert rest_jwt_expiry(1_760_000_000) == 1_760_000_000 + REST_JWT_TTL_S


def test_expiry_truncates_fractional_seconds():
    assert rest_jwt_expiry(1_760_000_000.999, 60) == 1_760_000_060
