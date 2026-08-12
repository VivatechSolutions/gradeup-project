"""
Per-student Google OAuth for the seminar PPT co-pilot (direct, no Scalekit).

Each student authorizes Google in their browser; we exchange the code, store their token
(with refresh token) keyed by student_id, and refresh it as needed. Unlike Scalekit (which
does not return the raw token to us), this keeps the token on our side so we can call the
Slides/Drive API directly on the student's behalf.

Flow:
  1. auth_url(student_id)      -> Google consent URL (state carries the student_id).
  2. Google redirects to  GET /ppt/auth/callback?code=..&state=<student_id>
  3. handle_callback(code, state) -> stores google_student_tokens/<student_id>.json
  4. get_access_token(student_id) -> fresh access token (auto-refreshes).

Config (.env):
  GOOGLE_OAUTH_CLIENT_JSON   = path to the OAuth client secrets OR the raw JSON content
                               (default ./oauth_client.json)
  GOOGLE_OAUTH_REDIRECT_URI  = the callback URL registered on that OAuth client
                               (default http://localhost:8000/ppt/auth/callback)
  PPT_STUDENT_TOKENS_DIR     = where per-student tokens are saved (default ./google_student_tokens)

The redirect URI MUST be added to the OAuth client's Authorized redirect URIs in Google Cloud.
"""

import json
import os
from typing import Optional

# Google often returns MORE scopes than requested (it auto-adds openid/userinfo, and merges
# previously-granted scopes). oauthlib raises "Scope has changed" on any mismatch — relax it,
# otherwise the token exchange fails even though the grant is valid.
os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

# drive.file (non-sensitive) lets the app create + manage the decks it makes for the student.
SCOPES = [
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/drive.file",
]
_CLIENT_SECRETS_ENV = os.environ.get("GOOGLE_OAUTH_CLIENT_JSON", "./oauth_client.json")
REDIRECT_URI = os.environ.get("GOOGLE_OAUTH_REDIRECT_URI",
                              "http://localhost:8000/ppt/auth/callback")
TOKENS_DIR = os.environ.get("PPT_STUDENT_TOKENS_DIR", "./google_student_tokens")


def is_configured() -> bool:
    val = _CLIENT_SECRETS_ENV.strip()
    return val.startswith("{") or os.path.exists(val)


def _flow(state: Optional[str] = None):
    from google_auth_oauthlib.flow import Flow
    val = _CLIENT_SECRETS_ENV.strip()
    # Disable PKCE: we build a fresh Flow in auth_url() and again in the callback, so a
    # generated code_verifier wouldn't survive between them. Our client is confidential
    # (has a client secret), so PKCE isn't required and this keeps the two steps consistent.
    if val.startswith("{"):
        # Inline JSON content supplied directly in the env var.
        client_config = json.loads(val)
        return Flow.from_client_config(
            client_config, scopes=SCOPES, redirect_uri=REDIRECT_URI, state=state, autogenerate_code_verifier=False,)
    else:
        return Flow.from_client_secrets_file(
            val, scopes=SCOPES, redirect_uri=REDIRECT_URI, state=state,
            autogenerate_code_verifier=False)


def _token_path(student_id: str) -> str:
    os.makedirs(TOKENS_DIR, exist_ok=True)
    safe = "".join(c for c in str(student_id) if c.isalnum() or c in "-_") or "student"
    return os.path.join(TOKENS_DIR, f"{safe}.json")


def is_connected(student_id: str) -> bool:
    return os.path.exists(_token_path(student_id))


def auth_url(student_id: str) -> Optional[str]:
    """Google consent URL for this student (state = student_id, so the callback knows who)."""
    if not is_configured():
        return None
    flow = _flow(state=student_id)
    url, _ = flow.authorization_url(
        access_type="offline",           # get a refresh token
        prompt="consent",                # ensure refresh token is returned
        include_granted_scopes="true",
    )
    return url


def handle_callback(code: str, state: str) -> bool:
    """Exchange the auth code for tokens and store them for the student (state=student_id)."""
    flow = _flow(state=state)
    flow.fetch_token(code=code)
    creds = flow.credentials
    with open(_token_path(state), "w") as f:
        f.write(creds.to_json())
    return True


def get_access_token(student_id: str) -> Optional[str]:
    """Return a valid access token for the student, refreshing if expired. None if not connected."""
    path = _token_path(student_id)
    if not os.path.exists(path):
        return None
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        creds = Credentials.from_authorized_user_file(path, SCOPES)
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(path, "w") as f:
                f.write(creds.to_json())
        return creds.token if creds else None
    except Exception as e:
        print(f"  [ppt_google_oauth] token load/refresh failed for {student_id}: {e}")
        return None
