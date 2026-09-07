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
capital → flag. A wrong guess - or a skip, for when you have no clue - reveals
the next clue and drops the score by 250,
from 1500 down to 250. A round ends on a correct guess or after the last clue.

Answering fast earns up to 250 on top. The bonus is worth full marks for the
first three seconds a clue is on screen, then drains to nothing over twenty; the
clock restarts on every clue. The cap is one rung of the ladder on purpose — it
is the largest bonus at which knowing the answer still beats being quick, and
any higher would make throwing a guess away to reset the clock the winning play.
The server stamps the clue's start time inside the `gameId`, so the bar on
screen is cosmetic and the score cannot be gamed from the client.

### Round state

There is no session store. The whole round — country, clue index, and the facts
already fetched — is encrypted into the `gameId` the client holds, using a
Fernet key derived from `GAME_SECRET`. That keeps rounds correct when
consecutive requests land on different processes, and means a player cannot
read the answer out of the token. Tampered or expired tokens are rejected.

The running total works the same way. It lives in a second token, the `runId`,
which the client keeps in `localStorage` and hands back on every call. The
server adds each solved round to it and returns a fresh token, so a refresh
keeps the score and the client never reports a total it did not earn. Both
token types carry a `kind`, so one cannot be passed off as the other.

`GAME_SECRET` is read from the environment, falling back to `.env` locally.
Without it the backend generates an ephemeral key and logs a warning — a
nuisance on one laptop, fatal on serverless, where every instance would derive
a different key and no round would survive a second request. On Vercel the
process refuses to start instead.

## API

- `GET /api/health` — status, dropdown and answerable country counts, and
  whether the live API is in use.
- `GET /api/countries` — the 250 dropdown options (`id`, `label`, `flag`).
- `POST /api/game` — start a round. Body `{ runId }`, where `runId` is the
  token from the last call or `null` on a first visit. Returns `gameId`,
  `caseNumber`, `score`, `clue`, `clueNumber`, `totalClues`, the speed-bonus
  contract (`timerMs`, `graceMs`, `maxTimeBonus`), and the run (`runId`,
  `runTotal`, `runRounds`).
- `POST /api/game/guess` — body `{ gameId, answer, runId }`, where `answer` is
  the country **name**. Returns `correct`, `score`, `gameOver`, `message`, plus
  `nextQuestion` while the round continues or `country` once it ends. A correct
  answer also breaks `score` into `baseScore` and `timeBonus`. Every branch
  returns the run, so the client always has a live `runId` to send back.
- `POST /api/game/skip` — body `{ gameId, runId }`. Pass on the clue: the
  same response as a wrong guess, minus `comparison`, since there is no guess
  to compare. On the last clue it ends the round and reveals the country.

Answer matching is case- and accent-insensitive, so `cote d'ivoire` matches
`Côte d’Ivoire`.

## Layout

```
api/index.py      Flask app (the only HTTP layer)
quiz/loop.py      clue ladder, scoring, speed bonus, answer matching
quiz/facts.py     ApogeoAPI client, field normalisation, offline fixtures
quiz/session.py   encrypted round and run tokens
quiz/env.py       settings from the environment, with a .env fallback
countries.csv     250 name/iso2 pairs
vercel.json       /api rewrite and the CSV bundling rule
src/              React frontend
src/runToken.ts   where the run token is parked between page loads
scripts/export_countries.py   regenerates countries.csv
```

## Deploying to Vercel

`vercel.json` does two things: rewrites `/api/*` to the Flask function, and
bundles `countries.csv`, which the function reads by path and Vercel would not
otherwise trace into the build. The frontend needs no configuration — Vercel
detects Vite and serves `dist`.

Set two environment variables on the project: `GAME_SECRET` and
`APOGEO_API_KEY`. `.env` is gitignored and never reaches the bundle.

After a preview deploy, `GET /api/health` is the check worth making. A 200
proves both the rewrite and the CSV bundling work, and `usingLiveApi: true`
proves the API key arrived — `false` means the game silently fell back to its
12 fixture countries.

`.python-version` pins 3.12, which is what Vercel builds on.

## Export countries

```sh
printf 'APOGEOAPI_KEY="your_api_key"\n' > .env
python3 scripts/export_countries.py
```

Writes `name` and `iso2` columns to `countries.csv`.
