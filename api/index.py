"""HTTP layer over the country-clue game.

Vercel loads the ``app`` in this file as a single function and ``vercel.json``
rewrites every /api/* path to it, so Flask does the routing in both
environments. Locally, run it with ``python -m api.index``.
"""

from __future__ import annotations

import logging
import random
import time
import uuid
from typing import Any, Optional, Tuple

from flask import Flask, jsonify, request

from quiz import session
from quiz.facts import playable_countries, using_live_api
from quiz.loop import (
    CATEGORY_LABELS,
    HINT_CATEGORIES,
    MAX_TIME_BONUS,
    TIME_GRACE_SECONDS,
    TIME_WINDOW_SECONDS,
    TOTAL_CLUES,
    build_clue,
    flag_emoji,
    is_correct,
    load_countries,
    normalise_answer,
    score_for,
    time_bonus_for,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# countries.csv never changes at runtime, so read it once per process.
_countries_cache: Optional[list] = None


def _dropdown_countries() -> list:
    """The full CSV list. Kept separate from the answer pool so the dropdown
    works without the API and always contains every answerable country."""
    global _countries_cache
    if _countries_cache is None:
        _countries_cache = load_countries()
    return _countries_cache


def _question(state: dict) -> dict:
    """The payload the frontend renders for the current clue.

    Both entry points to a clue - starting a round and advancing after a wrong
    guess - come through here, so this is the one place the speed clock has to
    be stamped. The stamp rides inside the encrypted token, which means the
    player can neither read it nor forge it, and replaying an old gameId only
    makes their time worse.
    """
    state["clue_started_at"] = time.time()
    hint_index = state["hint_index"]
    return {
        "gameId": session.encode(state, session.KIND_ROUND),
        "caseNumber": state["case"],
        "score": score_for(hint_index),
        "clue": build_clue(hint_index, state["facts"], state["iso2"]),
        "clueNumber": hint_index + 1,
        "totalClues": TOTAL_CLUES,
        # Durations, not wall-clock times: the client animates a countdown it
        # was handed, so its own clock never enters the scoring.
        "timerMs": round(TIME_WINDOW_SECONDS * 1000),
        "graceMs": round(TIME_GRACE_SECONDS * 1000),
        "maxTimeBonus": MAX_TIME_BONUS,
    }


def _elapsed_seconds(state: dict) -> Optional[float]:
    """How long the current clue has been on screen, by the server's clock."""
    started_at = state.get("clue_started_at")
    if not isinstance(started_at, (int, float)):
        return None
    return time.time() - started_at


def _load_run(run_id: Optional[str]) -> dict:
    """The run the client is continuing, or a fresh one.

    The running total lives here rather than in the browser, so a refresh no
    longer wipes it and the client cannot report a score it did not earn. An
    absent, expired, tampered or wrong-kind token quietly starts a new run -
    there is nothing a player gains by any of those.
    """
    run = session.decode(run_id, session.KIND_RUN) if isinstance(run_id, str) else None
    if run is None:
        # run_id is unused today. It costs one field and is what a scoreboard
        # would key on later.
        return {"run_id": uuid.uuid4().hex, "total": 0, "rounds": 0}
    return run


def _run_payload(run: dict) -> dict:
    return {
        "runId": session.encode(run, session.KIND_RUN),
        "runTotal": run["total"],
        "runRounds": run["rounds"],
    }


def _reveal(state: dict) -> dict:
    iso2 = state["iso2"]
    entry = next((c for c in _dropdown_countries() if c.iso2 == iso2), None)
    return {
        "name": state["country"],
        "iso2": iso2,
        "flag": state["facts"].get("flag") or flag_emoji(iso2),
        "numericCode": entry.numeric_code if entry else "",
        "lat": entry.latitude if entry else None,
        "lng": entry.longitude if entry else None,
    }


def _comparison(state: dict, guess: str) -> Optional[dict]:
    """How the guessed country answers the clue currently on screen.

    A wrong guess is more interesting when it tells you something: guess Sweden
    against a UTC+04:00 clue and seeing "Sweden UTC+01:00" shows how far off you
    were. The facts are already cached, so this costs no extra API call.
    """
    hint_index = state["hint_index"]
    if hint_index >= len(HINT_CATEGORIES):
        return None
    category = HINT_CATEGORIES[hint_index]

    wanted = normalise_answer(guess)
    entry = next(
        (c for c in playable_countries() if normalise_answer(c["name"]) == wanted), None
    )
    if entry is None:
        return None

    value = entry["facts"].get(category) or "No data"
    # The target value was already on screen as the clue, so it is not a leak.
    target = state["facts"].get(category) or "No data"

    return {
        "name": entry["name"],
        "category": CATEGORY_LABELS.get(category, category),
        "value": value,
        "target": target,
        # 18 countries share +1, so matching a clue and still being wrong is
        # common. Saying so beats rendering "+1 -> you need +1".
        "matches": value == target,
    }


@app.get("/api/health")
def health() -> Tuple[Any, int]:
    return jsonify(
        {
            "status": "ok",
            "dropdownCountries": len(_dropdown_countries()),
            "answerableCountries": len(playable_countries()),
            "usingLiveApi": using_live_api(),
        }
    ), 200


@app.get("/api/countries")
def countries() -> Tuple[Any, int]:
    return jsonify(
        {
            "countries": [
                {
                    "id": country.iso2 or country.name,
                    "label": country.name,
                    # Everything the globe needs to place a guess: the polygon
                    # key, plus a position for countries with no polygon.
                    "numericCode": country.numeric_code,
                    "lat": country.latitude,
                    "lng": country.longitude,
                }
                for country in _dropdown_countries()
            ]
        }
    ), 200


@app.post("/api/game")
def start_game() -> Tuple[Any, int]:
    pool = playable_countries()
    if not pool:
        return jsonify({"error": "No countries available"}), 503

    payload = request.get_json(silent=True) or {}
    run = _load_run(payload.get("runId"))

    country = random.choice(pool)
    state = {
        "country": country["name"],
        "iso2": country["iso2"],
        "hint_index": 0,
        "facts": country["facts"],
        "case": "#{:03d}".format(random.randint(1, 999)),
    }
    return jsonify({**_question(state), **_run_payload(run)}), 201


@app.post("/api/game/guess")
def guess() -> Tuple[Any, int]:
    payload = request.get_json(silent=True) or {}
    game_id = payload.get("gameId")
    answer = payload.get("answer")

    if not isinstance(answer, str) or not answer.strip():
        return jsonify({"error": "answer is required"}), 400

    state = session.decode(game_id, session.KIND_ROUND)
    if state is None:
        return jsonify({"error": "This case file has expired. Start a new investigation."}), 400

    # Every branch returns the run, so the client always has a live token to
    # send back - including the ones that do not change the score.
    run = _load_run(payload.get("runId"))
    hint_index = state["hint_index"]

    if is_correct(answer, state["country"]):
        base_score = score_for(hint_index)
        time_bonus = time_bonus_for(_elapsed_seconds(state))
        round_score = base_score + time_bonus
        run["total"] += round_score
        run["rounds"] += 1
        return jsonify(
            {
                "correct": True,
                # Broken out because a bare 1187 reads as arbitrary. Showing
                # "1000 + 187 speed" is what makes the mechanic feel fair.
                "baseScore": base_score,
                "timeBonus": time_bonus,
                "score": round_score,
                "gameOver": True,
                "message": "Case solved.",
                "country": _reveal(state),
                **_run_payload(run),
            }
        ), 200

    return _miss(state, run, _comparison(state, answer), "Not quite. The investigation continues…")


@app.post("/api/game/skip")
def skip() -> Tuple[Any, int]:
    """Pass on the clue without guessing.

    Costs the same rung as a wrong guess. A wrong guess at least tells you how
    your country compares, so skipping is only ever the lazier option, never
    the better one - which is what keeps it from being an exploit.
    """
    payload = request.get_json(silent=True) or {}
    state = session.decode(payload.get("gameId"), session.KIND_ROUND)
    if state is None:
        return jsonify({"error": "This case file has expired. Start a new investigation."}), 400
    run = _load_run(payload.get("runId"))
    return _miss(state, run, None, "Skipped. On to the next clue.")


def _miss(state: dict, run: dict, comparison: Optional[dict], message: str) -> Tuple[Any, int]:
    """Move the round on after a clue went unanswered - wrong guess or skip."""
    hint_index = state["hint_index"]

    if hint_index + 1 >= TOTAL_CLUES:
        return jsonify(
            {
                "correct": False,
                "score": 0,
                "gameOver": True,
                "message": "The trail goes cold. Start a new investigation.",
                "country": _reveal(state),
                "comparison": comparison,
                **_run_payload(run),
            }
        ), 200

    state["hint_index"] = hint_index + 1
    return jsonify(
        {
            "correct": False,
            "score": 0,
            "gameOver": False,
            "message": message,
            "nextQuestion": _question(state),
            "comparison": comparison,
            **_run_payload(run),
        }
    ), 200


if __name__ == "__main__":
    import os

    app.run(
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "5001")),
        debug=os.environ.get("FLASK_DEBUG", "1") == "1",
    )
