"""HTTP layer over the country-clue game.

Vercel loads the ``app`` in this file as a single function and ``vercel.json``
rewrites every /api/* path to it, so Flask does the routing in both
environments. Locally, run it with ``python -m api.index``.
"""

from __future__ import annotations

import logging
import random
from typing import Any, Optional, Tuple

from flask import Flask, jsonify, request

from quiz import session
from quiz.facts import playable_countries, using_live_api
from quiz.loop import (
    TOTAL_CLUES,
    build_clue,
    flag_emoji,
    is_correct,
    load_countries,
    score_for,
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
    """The payload the frontend renders for the current clue."""
    hint_index = state["hint_index"]
    return {
        "gameId": session.encode(state),
        "caseNumber": state["case"],
        "score": score_for(hint_index),
        "clue": build_clue(hint_index, state["facts"], state["iso2"]),
        "clueNumber": hint_index + 1,
        "totalClues": TOTAL_CLUES,
    }


def _reveal(state: dict) -> dict:
    return {
        "name": state["country"],
        "flag": state["facts"].get("flag") or flag_emoji(state["iso2"]),
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
                    "flag": flag_emoji(country.iso2),
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

    country = random.choice(pool)
    state = {
        "country": country["name"],
        "iso2": country["iso2"],
        "hint_index": 0,
        "facts": country["facts"],
        "case": "#{:03d}".format(random.randint(1, 999)),
    }
    return jsonify(_question(state)), 201


@app.post("/api/game/guess")
def guess() -> Tuple[Any, int]:
    payload = request.get_json(silent=True) or {}
    game_id = payload.get("gameId")
    answer = payload.get("answer")

    if not isinstance(answer, str) or not answer.strip():
        return jsonify({"error": "answer is required"}), 400

    state = session.decode(game_id)
    if state is None:
        return jsonify({"error": "This case file has expired. Start a new investigation."}), 400

    hint_index = state["hint_index"]

    if is_correct(answer, state["country"]):
        return jsonify(
            {
                "correct": True,
                "score": score_for(hint_index),
                "gameOver": True,
                "message": "Case solved.",
                "country": _reveal(state),
            }
        ), 200

    if hint_index + 1 >= TOTAL_CLUES:
        return jsonify(
            {
                "correct": False,
                "score": 0,
                "gameOver": True,
                "message": "The trail goes cold. Start a new investigation.",
                "country": _reveal(state),
            }
        ), 200

    state["hint_index"] = hint_index + 1
    return jsonify(
        {
            "correct": False,
            "score": 0,
            "gameOver": False,
            "message": "Not quite. The investigation continues…",
            "nextQuestion": _question(state),
        }
    ), 200


if __name__ == "__main__":
    import os

    app.run(
        host=os.environ.get("HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "5001")),
        debug=os.environ.get("FLASK_DEBUG", "1") == "1",
    )
