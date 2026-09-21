"""
Request filter for scanner traffic.

Bots sweep public hosts for leaked config: /.env, /.git/config, /config.json,
/settings.py and friends. Nothing in this API serves those, but a traversal bug
in any file-serving route (/pdf/{document_id}, /markdown/{document_id}) would,
so the check runs before routing and rejects the request outright.

Every rejected request is logged at WARNING through the shared logger, so the
attempts show up on the console (and in LOG_FILE when it is configured).
"""

from __future__ import annotations

import os
import posixpath
import re
from typing import Any, Callable, Optional, Set
from urllib.parse import unquote

from starlette.responses import PlainTextResponse

from logger import get_logger

logger = get_logger("gradeup.security")


# Log a line for *every* request, not just blocked ones. Off by default because
# uvicorn already writes an access log; set SECURITY_LOG_ALL_REQUESTS=true to
# mirror those into the app log with the normalized path.
LOG_ALL_REQUESTS = os.getenv("SECURITY_LOG_ALL_REQUESTS", "false").lower() in {"1", "true", "yes"}


BLOCKED_PATHS_TEXT = """
/.aws/credentials
/phpinfo
/phpinfo.php
/php.php
/php-info.php
/_fragment
/info
/info.php
/index.php/phpinfo
/app_dev.php/_profiler/phpinfo
/_profiler/phpinfo
/_profiler/phpinfo.php
/debug/default
/test.php
/test1.php
/test2.php
/frontend_dev.php/$
/.env
/.env.bak
/.env.example
/.env.local
/.env.old
/.env.prod
/.env.production.local
/.env.stage
/.git/config
/.profile
/.flaskenv
/.ftpconfig
/.sftp.json
/sftp-config.json
/config.js
/config.json
/config/config.json
/gulpfile.js
/web.config
/docker-compose.yml
/dockerfile
/cdk.json
/serverless.yml
/main.js
/app.js
/server.js
/index.js
/lambda_function.py
/program.cs
/app.config.js
/appsettings.json
/appsettings.development.json
/appsettings.production.json
/package.json
/tsconfig.json
/readme.md
/manifest.json
/config/aws.json
/settings.py
/project/settings.py
/config/settings.py
/config/settings.json
/config/settings.yml
/config.yaml
/config.yml
/application.properties
/src/main/resources/application.properties
/src/main/resources/application-dev.properties
/src/main/resources/application-prod.properties
/sites/default/settings.php
/app/etc/env.php
/app/etc/local.xml
/wp-config.php
/config/database.php
/config.php
/cloudformation-template.yaml
/cloudformation-template.json
/template.yaml
/stepfunctions/state-machine-definition.json
/terraform.tfvars
/main.tf
/variables.tf
/k8s/deployment.yaml
/kubernetes/secrets.yaml
/buildspec.yml
/pipeline.yml
/config/development.yaml
/config/production.yaml
/.ebextensions/myconfig.config
/ebextensions.config
/apprunner.yaml
/.elasticbeanstalk/config.yml
/config.nim
/config/config.go
/config.rs
/config/application.rb
/config/environments/development.rb
/config/environments/production.rb
/config/initializers/devise.rb
/api/.env
/apps/.env
/admin/.env
/app/.env
/core/.env
/backend/.env
/server/.env
/src/.env
/internal/.env
/services/.env
/api/v1/.env
/api/v2/.env
/env/.env
/env/dev/.env
/env/prod/.env
/env/test/.env
/config/dev/.env
/config/prod/.env
/admin/dev/.env
/admin/prod/.env
/dev/.env
/production/.env
"""


BLOCKED_PATHS = {
    path.strip().lower()
    for path in BLOCKED_PATHS_TEXT.splitlines()
    if path.strip()
}


BLOCKED_REGEXES = [
    re.compile(
        r"\.(env|bak|local|old|stage|ini|lock|cache|xml|yaml|yml|json|"
        r"config|conf|pl|sh|rb|php|py|cs|go|rs|toml|ts|kt|edn|"
        r"exs?|swift|lua|jl|ml|m|f90|cbl|cfc|cfm)$",
        re.IGNORECASE,
    ),
    re.compile(r"/\.git(?:/|$)", re.IGNORECASE),
    re.compile(r"/\.vscode(?:/|$)", re.IGNORECASE),
    re.compile(r"/\.idea(?:/|$)", re.IGNORECASE),
    re.compile(r"/config(?:/|$)", re.IGNORECASE),
    re.compile(r"/secrets(?:/|$)", re.IGNORECASE),
    re.compile(r"/etc(?:/|$)", re.IGNORECASE),
    re.compile(r"/app(?:/|$)", re.IGNORECASE),
    re.compile(r"/resources(?:/|$)", re.IGNORECASE),
    re.compile(r"/docs(?:/|$)", re.IGNORECASE),
    re.compile(r"/src(?:/|$)", re.IGNORECASE),
    re.compile(r"/grails-app(?:/|$)", re.IGNORECASE),
    re.compile(r"/kubernetes(?:/|$)", re.IGNORECASE),
    re.compile(r"/scripts(?:/|$)", re.IGNORECASE),
    re.compile(r"/bucket-name(?:/|$)", re.IGNORECASE),
    re.compile(r"/cloudformation", re.IGNORECASE),
    re.compile(r"/stepfunctions(?:/|$)", re.IGNORECASE),
    re.compile(r"/amplify(?:/|$)", re.IGNORECASE),
    re.compile(r"/terraform", re.IGNORECASE),
    re.compile(r"/codepipeline", re.IGNORECASE),
    re.compile(r"/ebextensions", re.IGNORECASE),
]


# FastAPI's own endpoints. /docs and /openapi.json would otherwise be caught by
# the "/docs" and "*.json" patterns above.
ALLOWED_PATHS = {
    "/",
    "/docs",
    "/docs/oauth2-redirect",
    "/redoc",
    "/openapi.json",
}


def normalize_request_path(raw_path: str) -> str:
    """
    Normalize a path to prevent basic encoded-path bypasses.

    Examples:
        /%2eenv              -> /.env
        //config//aws.json   -> /config/aws.json
        /pdf/..%2f..%2f.env  -> /.env
    """

    # Defensive: uvicorn keeps the query string out of raw_path, but other
    # servers are not required to.
    decoded_path = raw_path.split("?", 1)[0].split("#", 1)[0]

    # Decode multiple times to catch double encoding such as %252eenv.
    for _ in range(3):
        new_value = unquote(decoded_path)

        if new_value == decoded_path:
            break

        decoded_path = new_value

    decoded_path = decoded_path.replace("\\", "/")

    if not decoded_path.startswith("/"):
        decoded_path = "/" + decoded_path

    normalized_path = posixpath.normpath(decoded_path)

    if normalized_path == ".":
        normalized_path = "/"

    return normalized_path.lower()


def get_client_ip(scope: dict, headers: dict) -> str:
    """
    Get the client IP.

    X-Forwarded-For is only meaningful behind a trusted reverse proxy or load
    balancer; it is spoofable otherwise, so it is used for logging only and
    never for an access decision.
    """

    forwarded_for = headers.get("x-forwarded-for")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()[:64]

    client = scope.get("client")

    if client:
        return str(client[0])

    return "unknown"


def safe_for_log(value: str, limit: int = 200) -> str:
    """Strip control characters so a crafted path cannot forge extra log lines."""
    return re.sub(r"[\x00-\x1f\x7f]", "?", value)[:limit]


def is_blocked_path(request_path: str, known_prefixes: Optional[Set[str]] = None) -> bool:
    """
    Decide whether a normalized path looks like a config-file probe.

    `known_prefixes` holds the first segment of every route this app actually
    registers ("pdf", "tutor", "ppt", ...). Paths under a real route skip the
    pattern rules, because path parameters carry user data - a document_id of
    "notes.json" must not trip the "*.json" pattern. The literal blocklist and
    the null-byte check always apply, and traversal is resolved before this
    runs, so /pdf/../../.env is tested as /.env and still blocked.
    """

    if "\x00" in request_path:
        return True

    if request_path in ALLOWED_PATHS:
        return False

    if request_path in BLOCKED_PATHS:
        return True

    if known_prefixes:
        segments = request_path.split("/")
        first_segment = segments[1] if len(segments) > 1 else ""

        if first_segment in known_prefixes:
            return False

    return any(pattern.search(request_path) for pattern in BLOCKED_REGEXES)


def collect_route_prefixes(app: Any) -> Set[str]:
    """First path segment of every route registered on the app, lowercased."""

    prefixes: Set[str] = set()

    for route in getattr(app, "routes", []):
        path = getattr(route, "path", "")

        if not path.startswith("/"):
            continue

        segments = path.split("/")
        segment = segments[1].lower() if len(segments) > 1 else ""

        # "/{document_id}" style catch-alls have no fixed prefix to trust.
        if segment and not segment.startswith("{"):
            prefixes.add(segment)

    return prefixes


class SecureRequestMiddleware:
    """
    Pure-ASGI request filter.

    Written at the ASGI level rather than on BaseHTTPMiddleware so it never
    touches request or response bodies - this API streams audio responses and
    accepts large PDF uploads, both of which BaseHTTPMiddleware pumps through
    an extra task.
    """

    def __init__(self, app: Callable, fastapi_app: Any = None) -> None:
        self.app = app
        self.fastapi_app = fastapi_app
        self._known_prefixes: Optional[Set[str]] = None

    def _prefixes(self) -> Optional[Set[str]]:
        # Resolved on first request: routes are registered after add_middleware.
        if self._known_prefixes is None and self.fastapi_app is not None:
            self._known_prefixes = collect_route_prefixes(self.fastapi_app)

        return self._known_prefixes

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope.get("type") not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        raw_path = scope.get("raw_path") or scope.get("path", "/")

        if isinstance(raw_path, bytes):
            raw_path = raw_path.decode("utf-8", errors="replace")

        request_path = normalize_request_path(raw_path)
        headers = {
            key.decode("latin-1").lower(): value.decode("latin-1", errors="replace")
            for key, value in scope.get("headers", [])
        }
        client_ip = get_client_ip(scope, headers)
        method = scope.get("method", scope.get("type", "-"))

        if LOG_ALL_REQUESTS:
            logger.info(
                "REQUEST ip=%s method=%s path=%s",
                client_ip,
                method,
                safe_for_log(request_path),
            )

        if is_blocked_path(request_path, self._prefixes()):
            logger.warning(
                "BLOCKED probe ip=%s method=%s path=%s raw=%s user_agent=%s",
                client_ip,
                method,
                safe_for_log(request_path),
                safe_for_log(raw_path),
                safe_for_log(headers.get("user-agent", "unknown"), 120),
            )

            if scope.get("type") == "websocket":
                await send({"type": "websocket.close", "code": 1008})
                return

            response = PlainTextResponse(
                content="Forbidden: suspicious path",
                status_code=403,
                headers={
                    "Cache-Control": "no-store",
                    "X-Content-Type-Options": "nosniff",
                },
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
