# Backend

Minimal FastAPI service for ShipyardHQ with Clerk auth, health endpoints, SQLModel, and Alembic.
Includes a basic admin UI at `/admin`.

## Environment

- `DATABASE_URL` (Postgres, example: `postgresql+psycopg://postgres:postgres@localhost:5432/shipyardhq`)
- `CLERK_JWKS_URL`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_JS_URL` (optional, default to Clerk CDN if you prefer)
- `CLERK_VERIFY_IAT` (optional, default: true)
- `CLERK_LEEWAY` (optional, default: 0)
- `CLERK_SECRET_KEY` (used to sign admin sessions)
- `ADMIN_BASE_URL` (optional, default: `/admin`)
- `ADMIN_TITLE` (optional, default: `ShipyardHQ Admin`)
- `ADMIN_REDIRECT_URL` (optional, used when admin is disabled)
- `REDIS_URL` (optional, enables readiness cache checks)
- `CORS_ORIGINS` (optional, comma-separated list)

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn main:app --reload
```

## Migrations

```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```

## OpenAPI Export (CLI)

```bash
python scripts/export_openapi.py --output openapi.json
```

This exports the OpenAPI schema without starting the HTTP server.

## Admin

Visit `http://localhost:8000/admin` after starting the server.
