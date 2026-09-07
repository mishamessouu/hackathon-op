"""Core game logic for the country-clue quiz.

Stateless by design: nothing is stored on an instance. Every function takes the
round state and returns a value derived from it, so a round survives being
picked up by a different process than the one that started it.
"""

from __future__ import annotations

import csv
import os
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

# Hardest first, easiest last - measured by what a person can actually reason
# from, not by how much the field narrows the field mathematically. A phone
# code identifies a country almost uniquely but hardly anyone can use one, so
# it made the two highest-scoring clues unwinnable; the exchange rate hints at
# an economy instead, which is something a player can think about.
HINT_CATEGORIES = (
    "population",
    "timezone",
    "exchange_rate",
    "region_currency",
    "capital",
    "flag",
)
TOTAL_CLUES = len(HINT_CATEGORIES)

# The frontend shows a score in the thousands, so scale the "clues remaining"
# count that the original loop.py used into the same range.
POINTS_PER_REMAINING_CLUE = 250

CATEGORY_LABELS = {
    "population": "👥 Population",
    "timezone": "🕐 Timezone",
    "exchange_rate": "💱 Exchange rate",
    "region_currency": "🗺️ Region & currency",
    "capital": "🏙️ Capital",
    "flag": "🏳️ Flag",
}

DEFAULT_COUNTRIES_FILE = Path(
    os.getenv("COUNTRIES_FILE", Path(__file__).resolve().parents[1] / "countries.csv")
)


@dataclass(frozen=True)
class Country:
    name: str
    iso2: str
    # ISO 3166-1 numeric, which is how world-atlas keys its country polygons.
    numeric_code: str = ""
    # Fallback position for countries with no polygon at this resolution.
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def _to_float(value) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def load_countries(countries_file=None) -> List[Country]:
    """Read name/iso2 pairs from countries.csv."""
    path = Path(countries_file) if countries_file else DEFAULT_COUNTRIES_FILE
    with path.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        if not reader.fieldnames:
            return []
        name_column = next(
            (
                column
                for column in reader.fieldnames
                if column.lower() in {"country", "name", "country_name"}
            ),
            reader.fieldnames[0],
        )
        iso_column = next(
            (column for column in reader.fieldnames if column.lower() in {"iso2", "code"}),
            None,
        )
        countries = []
        for row in reader:
            name = (row.get(name_column) or "").strip()
            if not name:
                continue
            iso2 = (row.get(iso_column) or "").strip().upper() if iso_column else ""
            countries.append(
                Country(
                    name=name,
                    iso2=iso2,
                    numeric_code=(row.get("numeric_code") or "").strip(),
                    latitude=_to_float(row.get("latitude")),
                    longitude=_to_float(row.get("longitude")),
                )
            )
        return countries


def flag_emoji(iso2: str) -> str:
    """Turn an ISO2 code into its flag emoji via regional indicator symbols."""
    code = (iso2 or "").strip().upper()
    if len(code) != 2 or not code.isalpha():
        return "🌍"
    return "".join(chr(ord(character) - ord("A") + 0x1F1E6) for character in code)


def score_for(hint_index: int) -> int:
    """Points on offer while the clue at ``hint_index`` is showing."""
    return max(TOTAL_CLUES - hint_index, 1) * POINTS_PER_REMAINING_CLUE


def normalise_answer(value: str) -> str:
    """Casefold and strip accents so 'Cote d'Ivoire' matches 'Côte d’Ivoire'."""
    replaced = (value or "").replace("’", "'")
    decomposed = unicodedata.normalize("NFKD", replaced.casefold())
    return "".join(
        character for character in decomposed if not unicodedata.combining(character)
    ).strip()


def is_correct(answer: str, country_name: str) -> bool:
    return bool(answer) and normalise_answer(answer) == normalise_answer(country_name)


def build_clue(hint_index: int, facts: dict, iso2: str) -> Optional[dict]:
    """Shape the clue at ``hint_index`` the way the frontend renders it."""
    if hint_index >= TOTAL_CLUES:
        return None

    category = HINT_CATEGORIES[hint_index]
    if category == "flag":
        # The API supplies the emoji; derive it from the ISO2 code offline.
        text = facts.get("flag") or flag_emoji(iso2)
    else:
        text = facts.get(category) or "This clue is unavailable for this country."

    return {
        "id": "clue-{}".format(hint_index + 1),
        "category": CATEGORY_LABELS.get(category, category),
        "text": text,
    }
