"""Round state carried in an encrypted token instead of server memory.

The whole round lives in the ``gameId`` the client holds. That keeps the game
correct when consecutive requests land on different processes, and encrypting
rather than merely signing means the player cannot read the answer out of it.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from quiz import env

logger = logging.getLogger(__name__)

# A round left open for longer than this has been abandoned.
TOKEN_TTL_SECONDS = 60 * 60 * 6

_fernet: Optional[Fernet] = None


def _derive_key(secret: str) -> bytes:
    """Accept any string as GAME_SECRET rather than demanding Fernet's format."""
    return base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        secret = env.setting("GAME_SECRET")
        if secret:
            _fernet = Fernet(_derive_key(secret))
        elif os.environ.get("VERCEL"):
            # An ephemeral key is a survivable annoyance locally and a total
            # outage on serverless: each instance derives a different key, so a
            # round started on one is undecodable on the next and every player
            # is told their case file expired. Refuse to boot instead.
            raise RuntimeError(
                "GAME_SECRET is required on Vercel. Without it every instance "
                "generates its own key and no round survives a second request. "
                "Set it in the project's environment variables."
            )
        else:
            logger.warning(
                "GAME_SECRET is not set - generating an ephemeral key. Rounds will "
                "not survive a restart. Set GAME_SECRET before deploying."
            )
            _fernet = Fernet(Fernet.generate_key())
    return _fernet


def encode(state: dict) -> str:
    payload = json.dumps(state, separators=(",", ":")).encode("utf-8")
    return _get_fernet().encrypt(payload).decode("ascii")


def decode(token: str) -> Optional[dict]:
    """Return the round state, or None if the token is invalid or expired."""
    if not token or not isinstance(token, str):
        return None
    try:
        payload = _get_fernet().decrypt(token.encode("ascii"), ttl=TOKEN_TTL_SECONDS)
    except (InvalidToken, UnicodeEncodeError, ValueError):
        return None
    try:
        state = json.loads(payload)
    except json.JSONDecodeError:
        return None
    return state if isinstance(state, dict) else None
