"""Game logic for the country-clue quiz.

The frontend can call ``start`` when its start button is pressed, display the
returned clue, and call ``guess`` for each submitted answer.
"""

from __future__ import annotations

import csv
import json
import os
import random
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


HINT_CATEGORIES = (
	"timezone",
	"phone_code",
	"population",
	"currency_shorthand",
	"capital",
	"flag_url",
)
DEFAULT_API_URL = "https://api.apogeoapi.com/v1/api/geo/countries"


class CountryQuiz:
	"""A stateful, frontend-agnostic quiz game."""

	def __init__(self, countries_file: str | os.PathLike[str] = "countries.csv", api_url: str | None = None):
		self.countries_file = Path(countries_file)
		self.api_url = (api_url or os.getenv("APOGEO_API_URL", DEFAULT_API_URL)).rstrip("/")
		self._countries = self._read_countries()
		if not self._countries:
			raise ValueError("countries.csv does not contain any countries")
		self.reset()

	def _read_countries(self) -> list[str]:
		with self.countries_file.open(newline="", encoding="utf-8") as file:
			reader = csv.DictReader(file)
			if not reader.fieldnames:
				return []
			name_column = next(
				(c for c in reader.fieldnames if c.lower() in {"country", "name", "country_name"}),
				reader.fieldnames[0],
			)
			return [row[name_column].strip() for row in reader if row.get(name_column, "").strip()]

	def reset(self) -> None:
		self.country = None
		self.facts: dict[str, object] = {}
		self.hint_index = 0
		self.score = 0
		self.finished = False

	def _fetch_facts(self, country: str) -> dict[str, object]:
		"""Fetch one country's data from ApogeoAPI.

		``APOGEO_API_URL`` may be set when the deployed API uses a different
		base URL. The response can be either an object or a one-item list.
		"""
		url = f"{self.api_url}/{quote(country)}"
		request = Request(url, headers={"Accept": "application/json"})
		with urlopen(request, timeout=10) as response:  # nosec B310 - URL is configurable by the app
			data = json.loads(response.read().decode("utf-8"))
		if isinstance(data, list):
			data = data[0] if data else {}
		return data.get("data", data) if isinstance(data, dict) else {}

	@staticmethod
	def _normalise_facts(data: dict[str, object]) -> dict[str, object]:
		aliases = {
			"timezone": ("timezone", "timezones"),
			"phone_code": ("phone_code", "phone", "callingCode", "calling_code"),
			"population": ("population",),
			"currency_shorthand": ("currency_shorthand", "currency", "currencies"),
			"capital": ("capital", "capitalCity"),
			"flag_url": ("flag_url", "flag", "flagURL", "flag_url"),
		}
		result = {}
		for category, keys in aliases.items():
			for key in keys:
				if key in data and data[key] not in (None, "", []):
					result[category] = data[key]
					break
		return result

	def start(self) -> dict[str, object]:
		"""Start a new round and return the first clue (timezone)."""
		self.reset()
		self.country = random.choice(self._countries)
		self.facts = self._normalise_facts(self._fetch_facts(self.country))
		return self.state()

	def state(self) -> dict[str, object]:
		clue = None if self.finished else self.facts.get(HINT_CATEGORIES[self.hint_index])
		return {"clue": clue, "category": None if self.finished else HINT_CATEGORIES[self.hint_index],
				"score": self.score, "finished": self.finished}

	def guess(self, answer: str) -> dict[str, object]:
		if self.country is None:
			raise RuntimeError("Call start() before submitting a guess")
		if self.finished:
			return self.state()
		if answer.strip().casefold() == self.country.casefold():
			self.score = len(HINT_CATEGORIES) - self.hint_index
			self.finished = True
			result = self.state()
			result.update({"correct": True, "country": self.country})
			return result
		if self.hint_index == len(HINT_CATEGORIES) - 1:
			self.finished = True
			result = self.state()
			result.update({"correct": False, "country": self.country})
			return result
		self.hint_index += 1
		result = self.state()
		result["correct"] = False
		return result
