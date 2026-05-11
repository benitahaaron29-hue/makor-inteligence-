"""Briefing API — generation, retrieval, archive."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import BriefingSvc
from app.core.enums import BriefingType
from app.schemas.briefing import (
    BriefingGenerateRequest,
    BriefingRead,
    BriefingSummary,
)
from app.services.briefing_service import BriefingConflictError

router = APIRouter(prefix="/briefings", tags=["briefings"])


@router.post(
    "/generate",
    response_model=BriefingRead,
    status_code=status.HTTP_201_CREATED,
    summary="Generate (and persist) a Morning FX & Macro briefing.",
)
async def generate_briefing(
    payload: BriefingGenerateRequest,
    service: BriefingSvc,
) -> BriefingRead:
    try:
        briefing = await service.generate_and_save(payload)
    except BriefingConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    return BriefingRead.model_validate(briefing)


@router.get(
    "/latest",
    response_model=BriefingRead,
    summary="Latest published briefing for the desk.",
)
async def get_latest_briefing(
    service: BriefingSvc,
    briefing_type: BriefingType = Query(default=BriefingType.MORNING_FX_MACRO),
) -> BriefingRead:
    briefing = await service.get_latest_published(briefing_type=briefing_type)
    if briefing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No published briefing found.",
        )
    return BriefingRead.model_validate(briefing)


@router.get(
    "/by-date/{briefing_date}",
    response_model=BriefingRead,
    summary="Retrieve a briefing for a specific trading date.",
)
async def get_briefing_by_date(
    briefing_date: date,
    service: BriefingSvc,
    briefing_type: BriefingType = Query(default=BriefingType.MORNING_FX_MACRO),
) -> BriefingRead:
    briefing = await service.get_for_date(briefing_date, briefing_type=briefing_type)
    if briefing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No briefing found for {briefing_date.isoformat()}.",
        )
    return BriefingRead.model_validate(briefing)


@router.get(
    "",
    response_model=list[BriefingSummary],
    summary="Recent briefings archive (most recent first).",
)
async def list_recent_briefings(
    service: BriefingSvc,
    limit: int = Query(default=30, ge=1, le=200),
) -> list[BriefingSummary]:
    briefings = await service.list_recent(limit=limit)
    return [BriefingSummary.model_validate(b) for b in briefings]
