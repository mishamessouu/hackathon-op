"""Country facts from ApogeoAPI.

All 250 countries come back from one `fields=full` request in under a second,
so the whole set is fetched once and cached rather than looked up per round.
That keeps a round from depending on a live API call mid-game.

Without an API key the module falls back to a small offline fixture set so the
game loop stays playable.
"""

from __future__ import annotations

import logging
import re
import time
from typing import List, Optional

import requests

from quiz import env

logger = logging.getLogger(__name__)

DEFAULT_API_URL = "https://api.apogeoapi.com/v1/countries"

# Both spellings are in use: scripts/export_countries.py reads the first,
# .env.example has historically shown the second.
API_KEY_NAMES = ("APOGEOAPI_KEY", "APOGEO_API_KEY")

# Countries whose capital does not name any of their zones. Without these the
# United States reports Hawaii and French Polynesia reports the Gambiers.
TIMEZONE_OVERRIDES = {
    "US": "America/New_York",
    "AU": "Australia/Sydney",
    "NZ": "Pacific/Auckland",
    "PF": "Pacific/Tahiti",
    "FM": "Pacific/Pohnpei",
}

CACHE_TTL_SECONDS = 60 * 60
REQUEST_TIMEOUT_SECONDS = 30

# Enough countries to play a real round without an API key.
OFFLINE_FACTS = {
    "Sweden": {"timezone": "UTC+01:00", "phone_code": "+46", "population": "About 11 million people", "currency_shorthand": "SEK", "capital": "Stockholm"},
    "Japan": {"timezone": "UTC+09:00", "phone_code": "+81", "population": "About 123 million people", "currency_shorthand": "JPY", "capital": "Tokyo"},
    "Brazil": {"timezone": "UTC−03:00", "phone_code": "+55", "population": "About 216 million people", "currency_shorthand": "BRL", "capital": "Brasilia"},
    "Kenya": {"timezone": "UTC+03:00", "phone_code": "+254", "population": "About 55 million people", "currency_shorthand": "KES", "capital": "Nairobi"},
    "Portugal": {"timezone": "UTC+00:00", "phone_code": "+351", "population": "About 10 million people", "currency_shorthand": "EUR", "capital": "Lisbon"},
    "Vietnam": {"timezone": "UTC+07:00", "phone_code": "+84", "population": "About 99 million people", "currency_shorthand": "VND", "capital": "Hanoi"},
    "Mexico": {"timezone": "UTC−06:00", "phone_code": "+52", "population": "About 128 million people", "currency_shorthand": "MXN", "capital": "Mexico City"},
    "Norway": {"timezone": "UTC+01:00", "phone_code": "+47", "population": "About 5 million people", "currency_shorthand": "NOK", "capital": "Oslo"},
    "Egypt": {"timezone": "UTC+02:00", "phone_code": "+20", "population": "About 113 million people", "currency_shorthand": "EGP", "capital": "Cairo"},
    "New Zealand": {"timezone": "UTC+12:00", "phone_code": "+64", "population": "About 5 million people", "currency_shorthand": "NZD", "capital": "Wellington"},
    "Argentina": {"timezone": "UTC−03:00", "phone_code": "+54", "population": "About 46 million people", "currency_shorthand": "ARS", "capital": "Buenos Aires"},
    "Iceland": {"timezone": "UTC+00:00", "phone_code": "+354", "population": "About 375,000 people", "currency_shorthand": "ISK", "capital": "Reykjavik"},
}

_cache: Optional[List[dict]] = None
_cached_at = 0.0


def get_api_key() -> Optional[str]:
    """Read the Apogeo key from the environment, falling back to the .env file."""
    return env.setting(*API_KEY_NAMES)


# A hyphen-minus is easy to misread as a plus at small sizes, and a UTC offset
# is otherwise identical either way. U+2212 is wider and sits at the same
# optical height as the plus, so the sign reads at a glance.
MINUS_SIGN = "\u2212"


def _pretty_offset(value: str) -> str:
    return value.replace("-", MINUS_SIGN) if value else value


def _format_population(value) -> Optional[str]:
    try:
        people = int(value)
    except (TypeError, ValueError):
        return None
    if people >= 1_000_000:
        return "About {:,} million people".format(round(people / 1_000_000))
    return "About {:,} people".format(round(people, -3))


def _pick_timezone(record: dict) -> Optional[dict]:
    """Choose the zone a player would associate with the country.

    Multi-zone countries are listed in an arbitrary order, so the first entry
    can be badly misleading - it put Russia in Kamchatka (UTC+12) rather than
    Moscow (UTC+03). Prefer the zone named after the capital. Falling back to
    the first entry beats guessing from longitude, which moved Brazil, Canada,
    Mexico and Kazakhstan off answers that were already right.
    """
    zones = record.get("timezones") or []
    if not zones:
        return None

    override = TIMEZONE_OVERRIDES.get((record.get("iso2") or "").upper())
    if override:
        for zone in zones:
            if zone.get("zoneName") == override:
                return zone

    def simplify(value):
        return re.sub(r"[^a-z]", "", (value or "").lower())

    capital = simplify(record.get("capital"))
    if capital:
        for zone in zones:
            city = (zone.get("zoneName") or "").split("/")[-1]
            if simplify(city) == capital:
                return zone
    return zones[0]


def facts_from_record(record: dict) -> dict:
    """Map one ApogeoAPI record onto the clue categories the game renders."""
    facts = {}

    timezones = record.get("timezones") or []
    chosen = _pick_timezone(record)
    if chosen:
        offset = _pretty_offset(chosen.get("gmtOffsetName") or "")
        if offset:
            zones = len({zone.get("gmtOffsetName") for zone in timezones})
            others = zones - 1
            facts["timezone"] = (
                "{} (and {} other offset{})".format(offset, others, "" if others == 1 else "s")
                if others
                else offset
            )

    phone_code = record.get("phoneCode")
    if phone_code:
        text = str(phone_code).strip()
        facts["phone_code"] = text if text.startswith("+") else "+" + text.lstrip("+")

    population = _format_population(record.get("population"))
    if population:
        facts["population"] = population

    currency = record.get("currency")
    if currency:
        facts["currency_shorthand"] = str(currency).strip()

    capital = record.get("capital")
    if capital:
        facts["capital"] = str(capital).strip()

    emoji = record.get("emoji")
    if emoji:
        facts["flag"] = str(emoji).strip()

    return facts


def is_playable(facts: dict) -> bool:
    """Every clue in the ladder must have a real value."""
    return all(
        facts.get(category)
        for category in ("timezone", "phone_code", "population", "currency_shorthand", "capital")
    )


def _fetch_all_records() -> Optional[List[dict]]:
    api_key = get_api_key()
    if not api_key:
        return None

    base = (env.setting("APOGEO_API_URL") or DEFAULT_API_URL).rstrip("/")
    try:
        response = requests.get(
            base,
            headers={"X-API-Key": api_key, "Accept": "application/json"},
            params={"limit": 250, "fields": "full"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        logger.warning("Apogeo bulk fetch failed: %s", error)
        return None

    records = payload.get("data", payload) if isinstance(payload, dict) else payload
    if not isinstance(records, list) or not records:
        logger.warning("Apogeo returned no country records")
        return None
    return records


def playable_countries() -> List[dict]:
    """Countries we can build a full clue ladder for: [{name, iso2, facts}]."""
    global _cache, _cached_at

    if _cache is not None and (time.time() - _cached_at) < CACHE_TTL_SECONDS:
        return _cache

    records = _fetch_all_records()
    if records:
        countries = []
        for record in records:
            facts = facts_from_record(record)
            if is_playable(facts):
                countries.append(
                    {
                        "name": str(record.get("name", "")).strip(),
                        "iso2": str(record.get("iso2", "")).strip().upper(),
                        "facts": facts,
                    }
                )
        if countries:
            logger.info("Loaded %d playable countries from ApogeoAPI", len(countries))
            _cache = countries
            _cached_at = time.time()
            return countries

    logger.warning("Falling back to offline fixture facts (%d countries)", len(OFFLINE_FACTS))
    _cache = [
        {
            "name": name,
            "iso2": "",
            "facts": dict(facts, timezone=_pretty_offset(facts.get("timezone", ""))),
        }
        for name, facts in sorted(OFFLINE_FACTS.items())
    ]
    _cached_at = time.time()
    return _cache


def using_live_api() -> bool:
    return bool(get_api_key())
