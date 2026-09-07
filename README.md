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

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
