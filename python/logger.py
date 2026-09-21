"""
Centralized logging system for GradeUp AI Pipeline & API.
Provides uniform formatting, log levels, console output, and optional file logging.
"""

from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

# Log format settings
DEFAULT_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FILE = os.getenv("LOG_FILE", "")  # e.g., "logs/gradeup.log"

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False

def setup_logging(
    level: Optional[str] = None,
    log_file: Optional[str] = None,
) -> None:
    """
    Initialize root logging handlers once.
    Safe to call multiple times (idempotent).
    """
    global _configured
    if _configured:
        return

    effective_level = getattr(logging, (level or DEFAULT_LOG_LEVEL).upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(effective_level)

    # Nearly every log line in this codebase carries emoji. On a console that is
    # not UTF-8 - the Windows cp1252 default - encoding one raises inside the
    # handler and the record is swallowed with a "--- Logging error ---" dump.
    # app.py does this too, for entry points that never import this module first.
    for _stream in (sys.stdout, sys.stderr):
        try:
            if hasattr(_stream, "reconfigure") and (getattr(_stream, "encoding", "") or "").lower() != "utf-8":
                _stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass  # non-reconfigurable stream (redirected/captured) - leave it alone

    # Avoid duplicate handlers if already attached
    if not root.handlers:
        # Console stdout handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(effective_level)
        formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)
        console_handler.setFormatter(formatter)
        root.addHandler(console_handler)

        # Optional rotating file handler
        target_file = log_file or LOG_FILE
        if target_file:
            try:
                log_path = Path(target_file)
                log_path.parent.mkdir(parents=True, exist_ok=True)
                file_handler = RotatingFileHandler(
                    log_path,
                    maxBytes=10 * 1024 * 1024,  # 10 MB
                    backupCount=5,
                    encoding="utf-8",
                )
                file_handler.setLevel(effective_level)
                file_handler.setFormatter(formatter)
                root.addHandler(file_handler)
            except Exception as e:
                root.warning(f"Could not initialize file logger at '{target_file}': {e}")

    _configured = True


# Initialize automatically on module load
setup_logging()


def get_logger(name: str = "gradeup") -> logging.Logger:
    """
    Factory function to get a named logger configured with GradeUp standards.
    """
    if not _configured:
        setup_logging()
    return logging.getLogger(name)
