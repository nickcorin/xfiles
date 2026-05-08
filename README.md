# X-Files Archive

A public archive website for ingesting, preserving, searching, categorizing, and reviewing the Department of War PURSUE UAP release page at `https://www.war.gov/UFO/`.

The system is split into two deployable applications:

- `backend/`: Python FastAPI service for ingestion, local source-file preservation, SQLite persistence, FTS search, review metadata, notes, and API delivery.
- `frontend/`: React/Vite browser app for archive browsing, document preview, search, categorization views, notes, and Mapbox globe browsing.

The backend is not TypeScript.

## Local Runtime

Create a local environment file if you want the globe to render:

```sh
cp .env.example .env
```

Set `VITE_MAPBOX_TOKEN` in `.env`, then run:

```sh
docker compose up --build
```

Open:

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:8000/api/health`

The preserved archive and SQLite database live in the `xfiles-data` Docker volume.

If an individual source file cannot be downloaded, ingestion keeps the source record with `download_status=failed`, the original URL, release metadata, failure reason, and retry count so a later ingest can retry it.

## Development

Backend:

```sh
cd backend
uv run pytest
uv run ruff format .
uv run ruff check .
uv run python -m xfiles_api
```

Frontend:

```sh
cd frontend
npm install
npm run dev
npm run build
```

## API Shape

The backend exposes product-level archive concepts instead of database internals:

- `POST /api/ingest`
- `GET /api/releases`
- `GET /api/records`
- `GET /api/records/{record_id}`
- `PATCH /api/records/{record_id}`
- `POST /api/records/{record_id}/notes`
- `GET /api/records/{record_id}/file`
- `GET /api/locations`

Every source record keeps its original source URL, release page URL, download status, source metadata, and retry state. Downloaded records also keep their content hash, download timestamp, and local storage path. Extracted text, tags, categories, review state, location data, summaries, and notes are stored as derived analysis data linked back to the source record.

## Deployment

Both applications have independent Dockerfiles. Deploy the backend with persistent storage mounted at `/data`, and deploy the frontend as a static Nginx container built with:

- `VITE_API_BASE_URL`
- `VITE_MAPBOX_TOKEN`

For production, place the backend behind HTTPS, restrict CORS to the deployed frontend origin, back up the `/data` volume, and treat Mapbox tokens as environment-specific deploy configuration.
