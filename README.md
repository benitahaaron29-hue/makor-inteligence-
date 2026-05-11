# Makor Intelligence Platform — Phase 1

Production-grade institutional FX & Macro intelligence platform.
Phase 1 delivers the runnable backend foundation: Morning Briefing generation,
persistence, and retrieval.

## Phase 1 capabilities

- FastAPI app with Swagger docs at `/docs`
- Async SQLAlchemy 2.0 + Alembic
- SQLite (default, zero-infra) or PostgreSQL via Docker Compose
- Mock briefing generator producing institutional-style Morning FX & Macro briefings
- Endpoints to generate, retrieve latest, retrieve by date, and list recent briefings
- Health and readiness probes

## Quick start (local, no Docker)

```bash
cd C:\makor-intelligence-platform

# 1. Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # PowerShell
# source .venv/bin/activate    # bash

# 2. Install
pip install -e .

# 3. (optional) copy env
copy .env.example .env

# 4. Run
uvicorn app.main:app --reload
```

Then open:

- API root         : http://localhost:8000/
- Swagger docs     : http://localhost:8000/docs
- ReDoc            : http://localhost:8000/redoc
- Liveness         : http://localhost:8000/api/v1/health
- Readiness        : http://localhost:8000/api/v1/health/ready

## Quick start (Docker Compose, with Postgres)

```bash
docker compose up --build
```

The API will be available on http://localhost:8000 backed by Postgres 16.

## Generating a briefing

```bash
# Generate today's Morning FX & Macro briefing (mock)
curl -X POST http://localhost:8000/api/v1/briefings/generate \
  -H "Content-Type: application/json" \
  -d "{}"

# Latest published
curl http://localhost:8000/api/v1/briefings/latest

# By date
curl http://localhost:8000/api/v1/briefings/by-date/2026-05-11

# Recent archive
curl "http://localhost:8000/api/v1/briefings?limit=10"
```

## Database migrations (optional in Phase 1)

The app calls `Base.metadata.create_all` on startup, so no migration is required
to boot. For production workflows:

```bash
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

## Layout

```
app/
  main.py                  FastAPI app factory + lifespan
  core/                    config, logging, enums
  db/                      Base, async session, init_db
  models/                  ORM models (Briefing)
  schemas/                 Pydantic schemas
  repositories/            Data-access layer
  services/                Generation pipeline + orchestration
  api/v1/                  Versioned API
alembic/                   Migration scripts
Dockerfile
docker-compose.yml
pyproject.toml
```

## Coming in later phases

- Market / news / calendar ingestion
- Anthropic-powered AI strategist commentary (replaces mock generator)
- Macro regime & volatility analysis modules
- Outlook desk-email ingestion
- React frontend
- Internal office deployment
