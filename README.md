# hackathon-op

🕵️ **API Detective** — guess the country from a ladder of clues, hardest first.

## Running locally

Two processes: Flask on `:5001` and Vite on `:5173`. The Vite dev server
proxies `/api` to Flask, so the frontend always calls a relative `/api` path
and no CORS handling is needed.

```sh
# Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then fill in APOGEOAPI_KEY and GAME_SECRET
python -m api.index

# Frontend, in a second terminal
npm install
npm run dev
```

Open http://localhost:5173.

### Country data

Two sources, deliberately kept apart:

- **`countries.csv`** feeds the answer dropdown — all 250 names, no API call, so
  the UI works even if Apogeo is down.
- **ApogeoAPI** feeds the clues. All 250 records arrive from a single
  `?limit=250&fields=full` request in about a second, cached for an hour, so no
  round depends on a live call mid-game. The 241 countries with a complete clue
  ladder form the answer pool; the 9 without (Antarctica, Bouvet Island and
  other uninhabited territories) stay in the dropdown as decoys.

Set `APOGEO_API_KEY` (or `APOGEOAPI_KEY` — both are read) in `.env`. Without a
key the backend falls back to a bundled fixture set of 12 countries and
`GET /api/health` reports `usingLiveApi: false`.

## How a round works

Six clues, hardest to easiest: timezone → phone code → population → currency →
capital → flag. A wrong guess reveals the next clue and drops the score by 250,
from 1500 down to 250. A round ends on a correct guess or after the last clue.

### Round state

There is no session store. The whole round — country, clue index, and the facts
already fetched — is encrypted into the `gameId` the client holds, using a
Fernet key derived from `GAME_SECRET`. That keeps rounds correct when
consecutive requests land on different processes, and means a player cannot
read the answer out of the token. Tampered or expired tokens are rejected.

Set `GAME_SECRET` in production. Without it the backend generates an ephemeral
key at startup and logs a warning; rounds then break on restart.

## API

- `GET /api/health` — status, dropdown and answerable country counts, and
  whether the live API is in use.
- `GET /api/countries` — the 250 dropdown options (`id`, `label`, `flag`).
- `POST /api/game` — start a round. Returns `gameId`, `caseNumber`, `score`,
  `clue`, `clueNumber`, `totalClues`.
- `POST /api/game/guess` — body `{ gameId, answer }`, where `answer` is the
  country **name**. Returns `correct`, `score`, `gameOver`, `message`, plus
  `nextQuestion` while the round continues or `country` once it ends.

Answer matching is case- and accent-insensitive, so `cote d'ivoire` matches
`Côte d’Ivoire`.

## Layout

```
api/index.py      Flask app (the only HTTP layer)
quiz/loop.py      clue ladder, scoring, answer matching
quiz/facts.py     ApogeoAPI client, field normalisation, offline fixtures
quiz/session.py   encrypted round token
countries.csv     250 name/iso2 pairs
src/              React frontend
scripts/export_countries.py   regenerates countries.csv
```

## Export countries

```sh
printf 'APOGEOAPI_KEY="your_api_key"\n' > .env
python3 scripts/export_countries.py
```

Writes `name` and `iso2` columns to `countries.csv`.
