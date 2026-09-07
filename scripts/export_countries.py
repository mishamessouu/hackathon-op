#!/usr/bin/env python3
"""Export ApogeoAPI country names and ISO2 codes to a CSV file."""

import csv
import os
import sys
import time
from pathlib import Path

import requests


API_URL = "https://api.apogeoapi.com/v1/countries"
PAGE_SIZE = 100
MAX_PAGES = 5
MAX_RETRIES = 3
SECRET_FILE = Path(__file__).resolve().parents[1] / ".env"


# Both spellings are in use across the repo.
API_KEY_NAMES = ("APOGEOAPI_KEY", "APOGEO_API_KEY")


def get_api_key():
    """Read the API key from the environment or the repository secret file."""
    for name in API_KEY_NAMES:
        api_key = os.environ.get(name)
        if api_key:
            return api_key

    if SECRET_FILE.exists():
        for line in SECRET_FILE.read_text(encoding="utf-8").splitlines():
            key, separator, value = line.partition("=")
            if separator and key.strip().replace("export ", "").strip() in API_KEY_NAMES:
                api_key = value.strip().strip('"').strip("'")
                if api_key:
                    return api_key

    raise RuntimeError(
        f"Set {API_KEY_NAMES[0]} or add it to {SECRET_FILE.name} in the repository root"
    )


def get_page(session, page):
    """Fetch one page, retrying rate limits and temporary server errors."""
    for attempt in range(MAX_RETRIES + 1):
        response = session.get(
            API_URL,
            params={"page": page, "limit": PAGE_SIZE, "fields": "full"},
            timeout=30,
        )

        if response.status_code == 429 or response.status_code >= 500:
            if attempt == MAX_RETRIES:
                response.raise_for_status()
            retry_after = response.headers.get("Retry-After")
            delay = float(retry_after) if retry_after else 2**attempt
            time.sleep(delay)
            continue

        response.raise_for_status()
        payload = response.json()
        countries = payload.get("data", payload) if isinstance(payload, dict) else payload
        if not isinstance(countries, list):
            raise ValueError("Unexpected ApogeoAPI response: expected a country list")
        return countries

    raise RuntimeError("Unable to fetch countries")


def export_countries(output_path):
    api_key = get_api_key()

    session = requests.Session()
    session.headers.update({"X-API-Key": api_key})

    countries = []
    page = 1
    while page <= MAX_PAGES:
        page_countries = get_page(session, page)
        countries.extend(page_countries)
        if len(page_countries) < PAGE_SIZE:
            break
        page += 1

    countries.sort(key=lambda country: country.get("name", ""))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=["name", "iso2", "numeric_code", "latitude", "longitude"],
        )
        writer.writeheader()
        writer.writerows(
            {
                "name": country.get("name", ""),
                "iso2": country.get("iso2", ""),
                "numeric_code": country.get("numericCode", ""),
                "latitude": country.get("latitude", ""),
                "longitude": country.get("longitude", ""),
            }
            for country in countries
        )

    print(f"Wrote {len(countries)} countries to {output_path}")


if __name__ == "__main__":
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("countries.csv")
    try:
        export_countries(destination)
    except (requests.RequestException, RuntimeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)