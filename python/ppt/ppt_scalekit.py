"""
Scalekit connected-accounts auth for the seminar PPT co-pilot.

Instead of the co-pilot running its own Google OAuth (authorize_google.py), each student
connects their own Google account through Scalekit. Scalekit stores + refreshes the token;
we fetch the student's current Google access token by identifier and use it to call the
Slides/Drive API on that student's behalf.

Flow:
  1. Frontend/backend calls get_authorization_link(student_id) → student clicks it, connects Google.
  2. For every slides call, get_access_token(student_id) → a fresh access token (Scalekit refreshes).

Config (.env):
  SCALEKIT_ENV_URL, SCALEKIT_CLIENT_ID, SCALEKIT_CLIENT_SECRET   — Scalekit API credentials.
  SCALEKIT_GOOGLE_CONNECTION (default "google")                  — the Google connection name
                                                                   as configured in Scalekit.

Degrades gracefully: if the env vars/SDK are absent, is_configured() is False and the caller
falls back to the existing OAuth/service-account credentials in mcp_slides_client.
"""

import os
from typing import Optional, Tuple

CONNECTION_NAME = os.environ.get("SCALEKIT_GOOGLE_CONNECTION", "google")

_client = None
_client_checked = False
_last_error: Optional[str] = None   # last failure reason, surfaced for debugging


def last_error() -> Optional[str]:
    return _last_error


def _fail(where: str, exc: Exception) -> None:
    global _last_error
    _last_error = f"{where}: {type(exc).__name__}: {exc}"
    print(f"  [ppt_scalekit] {_last_error}")

# authorization_details keys that may hold the OAuth access token, in priority order.
_TOKEN_KEYS = ("access_token", "accessToken", "token")
# connected_account.status values that mean "ready to use".
_ACTIVE_STATUSES = {"ACTIVE", "CONNECTED", "CONNECTED_ACCOUNT_STATUS_ACTIVE", "active"}


def is_configured() -> bool:
    """True when Scalekit credentials + SDK are available."""
    if not (os.environ.get("SCALEKIT_ENV_URL")
            and os.environ.get("SCALEKIT_CLIENT_ID")
            and os.environ.get("SCALEKIT_CLIENT_SECRET")):
        return False
    try:
        import scalekit  # noqa: F401
    except ImportError:
        return False
    return True


def _get_client():
    """Lazily build and cache the ScalekitClient (or None if unconfigured/failed)."""
    global _client, _client_checked
    if _client_checked:
        return _client
    _client_checked = True
    if not is_configured():
        return None
    try:
        from scalekit import ScalekitClient
        _client = ScalekitClient(
            os.environ["SCALEKIT_ENV_URL"],
            os.environ["SCALEKIT_CLIENT_ID"],
            os.environ["SCALEKIT_CLIENT_SECRET"],
        )
    except Exception as e:
        _fail("client init", e)
        _client = None
    return _client


def get_authorization_link(identifier: str) -> Optional[str]:
    """Return a Scalekit authorization link for the student to connect Google (or None)."""
    global _last_error
    client = _get_client()
    if client is None:
        return None
    # get_authorization_link is the primary; get_or_create_connected_account is a fallback that
    # also yields a link when the account is pending authorization (SDK/env variations).
    try:
        resp = client.actions.get_authorization_link(
            identifier=identifier, connection_name=CONNECTION_NAME)
        link = getattr(resp, "link", None)
        if link:
            _last_error = None
            return link
        _last_error = "get_authorization_link returned no link"
    except Exception as e:
        _fail("get_authorization_link", e)

    try:
        resp = client.actions.get_or_create_connected_account(
            connection_name=CONNECTION_NAME, identifier=identifier)
        acct = getattr(resp, "connected_account", None)
        link = getattr(acct, "authorization_url", None) or getattr(acct, "link", None)
        if link:
            _last_error = None
            return link
    except Exception as e:
        _fail("get_or_create_connected_account", e)
    return None


def _token_from_account(account) -> Optional[str]:
    """
    Extract the OAuth access token from a connected account.

    The SDK maps the proto into authorization_details as
    {"oauth_token": {"access_token": ...}} (or {"google_dwd": {"access_token": ...}}),
    so we check those nested shapes first, then a few flat fallbacks.
    """
    if account is None:
        return None
    details = getattr(account, "authorization_details", None) or {}
    if not isinstance(details, dict):
        return None
    # Nested shapes the SDK produces from the proto.
    for holder in ("oauth_token", "google_dwd"):
        sub = details.get(holder)
        if isinstance(sub, dict):
            for k in _TOKEN_KEYS:
                if sub.get(k):
                    return sub[k]
    # Flat fallbacks (in case a future env returns it at the top level).
    for k in _TOKEN_KEYS:
        if details.get(k):
            return details[k]
    return None


def get_access_token(identifier: str) -> Optional[str]:
    """
    Return the student's current Google access token via Scalekit, or None if not connected.
    Scalekit keeps the token refreshed, so this is safe to call before each slides operation.
    """
    client = _get_client()
    if client is None:
        return None
    try:
        resp = client.actions.get_connected_account(
            connection_name=CONNECTION_NAME, identifier=identifier)
        return _token_from_account(getattr(resp, "connected_account", None))
    except Exception as e:
        _fail("get_access_token (student not connected?)", e)
        return None


def connection_debug(identifier: str) -> dict:
    """Diagnostic: what does Scalekit return for this student's connected account?"""
    info = {
        "connection_name": CONNECTION_NAME,
        "client_initialized": _get_client() is not None,
        "identifier": identifier,
    }
    client = _get_client()
    if client is None:
        info["error"] = last_error()
        return info
    try:
        resp = client.actions.get_connected_account(
            connection_name=CONNECTION_NAME, identifier=identifier)
        acct = getattr(resp, "connected_account", None)
        if acct is None:
            info["found"] = False
            return info
        ad = getattr(acct, "authorization_details", None)
        info.update({
            "found": True,
            "status": getattr(acct, "status", None),
            "authorization_type": getattr(acct, "authorization_type", None),
            "returned_identifier": getattr(acct, "identifier", None),
            "auth_details_keys": (list(ad.keys()) if isinstance(ad, dict)
                                  else type(ad).__name__),
            "token_found": bool(_token_from_account(acct)),
            "token_expires_at": str(getattr(acct, "token_expires_at", None)),
        })
    except Exception as e:
        info["error"] = f"{type(e).__name__}: {e}"
    return info


def resolve_auth(identifier: str) -> Tuple[str, Optional[str]]:
    """
    Resolve how to authenticate a student's slides access.

    Returns (kind, token):
      - ("global", None)          : Scalekit not configured → use mcp_slides_client's own creds.
      - ("token", <access_token>) : student is connected → use this token.
      - ("needs_connection", None): Scalekit configured but student hasn't connected Google yet.
    """
    if not is_configured():
        return ("global", None)
    token = get_access_token(identifier)
    if token:
        return ("token", token)
    return ("needs_connection", None)
