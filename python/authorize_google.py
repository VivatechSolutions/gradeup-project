"""
One-time Google OAuth authorization for the PPT co-pilot (Path B — "as yourself").

Run this ONCE locally. It opens a browser, you consent with the Google account whose Drive
should own the seminar decks, and it saves a reusable token to google_token.json. After that,
mcp_slides_client picks the token up automatically and /ppt/session/start can create real decks.

Prerequisites (in the SAME Google Cloud project as your service account):
  1. APIs & Services → Library → enable **Google Slides API** and **Google Drive API**.
  2. APIs & Services → OAuth consent screen → User type **External** → add your Google
     account (karnambhavith37@gmail.com) under **Test users**.
  3. APIs & Services → Credentials → Create credentials → **OAuth client ID** →
      Application type **Desktop app** → download the JSON.
  4. Either save that file as ./oauth_client.json, set GOOGLE_OAUTH_CLIENT_JSON to its path,
     or set GOOGLE_OAUTH_CLIENT_JSON to the raw JSON content directly (no file needed).

Then:  ./venv/Scripts/python.exe authorize_google.py

Note: the consent screen will say the app is "unverified" (the Slides scope is sensitive).
Because you added yourself as a test user, click **Advanced → Go to <app> (unsafe)** to proceed —
this is your own app and your own account, so it is safe here.
"""

import json
import os
import sys

from mcp_slides_client import OAUTH_SCOPES

_CLIENT_SECRETS_ENV = os.environ.get("GOOGLE_OAUTH_CLIENT_JSON", "./oauth_client.json")
TOKEN_PATH = os.environ.get("GOOGLE_OAUTH_TOKEN_JSON", "./google_token.json")


def _load_flow(scopes):
    """Return an InstalledAppFlow from either inline JSON or a secrets file."""
    from google_auth_oauthlib.flow import InstalledAppFlow
    val = _CLIENT_SECRETS_ENV.strip()
    if val.startswith("{"):
        # Inline JSON content supplied directly in the env var.
        client_config = json.loads(val)
        return InstalledAppFlow.from_client_config(client_config, scopes)
    else:
        return InstalledAppFlow.from_client_secrets_file(val, scopes)


def main() -> int:
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

    val = _CLIENT_SECRETS_ENV.strip()
    if not val.startswith("{") and not os.path.exists(val):
        print(f"ERROR: OAuth client file not found: {val}")
        print("Download it from Google Cloud → Credentials → OAuth client ID (Desktop app),")
        print("and save it there, or set GOOGLE_OAUTH_CLIENT_JSON to the raw JSON content.")
        return 1

    flow = _load_flow(OAUTH_SCOPES)
    # Opens a browser and spins up a temporary localhost redirect listener.
    creds = flow.run_local_server(port=0, prompt="consent")

    with open(TOKEN_PATH, "w") as f:
        f.write(creds.to_json())

    print(f"\nAuthorized. Token saved to {TOKEN_PATH}")
    print("You can now start the app — /ppt/session/start will create real decks.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
