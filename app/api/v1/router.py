"""Aggregate router for API v1."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import briefings, health, sources, workflow

api_v1_router = APIRouter()
api_v1_router.include_router(health.router)
api_v1_router.include_router(briefings.router)
api_v1_router.include_router(sources.router)
api_v1_router.include_router(workflow.router)
