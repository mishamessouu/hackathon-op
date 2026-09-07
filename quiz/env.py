"""Reading settings from the environment, with a .env fallback for local dev.

There is no python-dotenv here, so nothing loads .env into ``os.environ``. Any
setting that wants to be configurable from that file has to read it explicitly,
which is what this module is for.

On Vercel .env is gitignored and absent from the bundle, so only the real
environment variables apply - which is the intent.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


def _from_env_file(names: tuple) -> Optional[str]:
    if not ENV_FILE.exists():
        return None
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        if not separator:
            continue
        if key.strip().replace("export ", "").strip() in names:
            candidate = value.strip().strip('"').strip("'")
            if candidate:
                return candidate
    return None


def setting(*names: str) -> Optional[str]:
    """First non-empty value for ``names``, checking the environment then .env."""
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    return _from_env_file(names)
