"""Ant Media Enterprise REST JWT signing.

ANTMEDIA_API_KEY is the shared HS256 signing secret (AMS `jwtSecretKey`), not a
token — sending it verbatim gets a 403 "Invalid App JWT Token". AMS checks only
the signature and `exp`, so no other claims are set.

This format is implemented twice, in two languages: here and in
`src/lib/streaming/rest-jwt.ts`. They were kept in step by comments in both files
and nothing else, and a whitespace change on either side breaks Enterprise auth
in production with a 403 that looks exactly like the IP-allowlist problem in the
deploy notes — so it would be misdiagnosed (SEC-188).

`fixtures/antmedia-rest-jwt.json` pins one (secret, exp) -> token pair and both
test suites assert against it. That fixture is what makes "keep the two in step"
enforceable rather than aspirational.
"""

import base64
import hashlib
import hmac
import json
import time

REST_JWT_TTL_S = 60


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _compact(obj: dict) -> bytes:
    """Serialize without spaces so this matches the TS side's JSON.stringify.

    `json.dumps` defaults to ", " and ": " separators; JavaScript emits neither.
    A single space here changes the base64 and every signature with it.
    """
    return json.dumps(obj, separators=(",", ":")).encode()


def sign_rest_jwt(secret: str, exp_seconds: int) -> str:
    """Sign a REST token that expires at `exp_seconds` (unix seconds)."""
    header = _b64url(_compact({"alg": "HS256", "typ": "JWT"}))
    payload = _b64url(_compact({"exp": exp_seconds}))
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = _b64url(hmac.new(secret.encode(), signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def rest_jwt_expiry(now_s: float | None = None, ttl_s: int = REST_JWT_TTL_S) -> int:
    """Expiry for a token minted now. Separated so callers stay testable."""
    return int(now_s if now_s is not None else time.time()) + ttl_s
