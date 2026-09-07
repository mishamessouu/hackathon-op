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
    "Sweden": {"population": "About 11 million people", "timezone": "UTC+01:00", "exchange_rate": "1 USD = 9.57 of the local currency", "region_currency": "Northern Europe, the Swedish krona", "capital": "Stockholm"},
    "Japan": {"population": "About 123 million people", "timezone": "UTC+09:00", "exchange_rate": "1 USD = 156 of the local currency", "region_currency": "Eastern Asia, the Japanese yen", "capital": "Tokyo"},
    "Brazil": {"population": "About 216 million people", "timezone": "UTC−03:00", "exchange_rate": "1 USD = 5.32 of the local currency", "region_currency": "South America, the Brazilian real", "capital": "Brasilia"},
    "Kenya": {"population": "About 55 million people", "timezone": "UTC+03:00", "exchange_rate": "1 USD = 129 of the local currency", "region_currency": "Eastern Africa, the Kenyan shilling", "capital": "Nairobi"},
    "Portugal": {"population": "About 10 million people", "timezone": "UTC+00:00", "exchange_rate": "1 USD = 0.92 of the local currency", "region_currency": "Southern Europe, the euro", "capital": "Lisbon"},
    "Vietnam": {"population": "About 99 million people", "timezone": "UTC+07:00", "exchange_rate": "1 USD = 26,002 of the local currency", "region_currency": "South-Eastern Asia, the Vietnamese đồng", "capital": "Hanoi"},
    "Mexico": {"population": "About 128 million people", "timezone": "UTC−06:00", "exchange_rate": "1 USD = 18 of the local currency", "region_currency": "Central America, the Mexican peso", "capital": "Mexico City"},
    "Norway": {"population": "About 5 million people", "timezone": "UTC+01:00", "exchange_rate": "1 USD = 10.62 of the local currency", "region_currency": "Northern Europe, the Norwegian krone", "capital": "Oslo"},
    "Egypt": {"population": "About 113 million people", "timezone": "UTC+02:00", "exchange_rate": "1 USD = 48 of the local currency", "region_currency": "Northern Africa, the Egyptian pound", "capital": "Cairo"},
    "New Zealand": {"population": "About 5 million people", "timezone": "UTC+13:00", "exchange_rate": "1 USD = 1.68 of the local currency", "region_currency": "Australia and New Zealand, the New Zealand dollar", "capital": "Wellington"},
    "Argentina": {"population": "About 46 million people", "timezone": "UTC−03:00", "exchange_rate": "1 USD = 1,507 of the local currency", "region_currency": "South America, the Argentine peso", "capital": "Buenos Aires"},
    "Iceland": {"population": "About 375,000 people", "timezone": "UTC+00:00", "exchange_rate": "1 USD = 124 of the local currency", "region_currency": "Northern Europe, the Icelandic króna", "capital": "Reykjavik"},
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

    # Names the economy without naming the currency, so it hints rather than tells.
    rate = (record.get("currencyRate") or {}).get("rate")
    if rate:
        try:
            amount = float(rate)
        except (TypeError, ValueError):
            amount = None
        if amount:
            shown = "{:,.0f}".format(amount) if amount >= 100 else "{:,.2f}".format(amount)
            facts["exchange_rate"] = "1 USD = {} of the local currency".format(shown)

    subregion = record.get("subregion")
    currency_name = record.get("currencyName")
    if subregion and currency_name:
        facts["region_currency"] = "{}, the {}".format(
            str(subregion).strip(), str(currency_name).strip()
        )

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
        for category in (
            "population",
            "timezone",
            "exchange_rate",
            "region_currency",
            "capital",
        )
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
