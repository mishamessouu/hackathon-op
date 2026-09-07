# hackathon-op

## Export countries

Install the Python dependency and set the API key from your ApogeoAPI dashboard:

```sh
python3 -m pip install -r requirements.txt
printf 'APOGEOAPI_KEY="your_api_key"\n' > .env
```

The `.env` file is ignored by Git. An `APOGEOAPI_KEY` environment variable, when
set, takes precedence over the value in that file.

Run the exporter from the repository root. It creates `countries.csv` unless an
output path is provided:

```sh
python3 scripts/export_countries.py
python3 scripts/export_countries.py data/countries.csv
```

The CSV contains `name` and `iso2` columns. The script uses the paginated
`/v1/countries` endpoint and retries rate-limit and temporary server responses.