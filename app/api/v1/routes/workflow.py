"""Morning workflow API — kicks off the 06:00 UTC pipeline on demand.

The scheduler (when wired) will call this same orchestrator at 06:00 UTC.
Until then, the desk can invoke it via this endpoint.
"""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.api.deps import DbSession
from app.schemas.briefing import BriefingRead
from app.services.morning_workflow import MorningWorkflow

router = APIRouter(prefix="/workflow", tags=["workflow"])


class WorkflowStepView(BaseModel):
    name: str
    status: str
    started_at: datetime
    finished_at: datetime
    detail: str
    records: int


class WorkflowRunResponse(BaseModel):
    target_date: date
    duration_ms: int
    steps: list[WorkflowStepView]
    briefing: BriefingRead


@router.post(
    "/morning/run",
    response_model=WorkflowRunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Run the morning briefing workflow now.",
)
async def run_morning_workflow(session: DbSession) -> WorkflowRunResponse:
    workflow = MorningWorkflow(session)
    result = await workflow.run()
    if result.briefing is None:
        # Should not happen — workflow.run() raises on failure.
        raise RuntimeError("Workflow returned no briefing")
    return WorkflowRunResponse(
        target_date=result.target_date,
        duration_ms=result.duration_ms,
        steps=[
            WorkflowStepView(
                name=s.name,
                status=s.status,
                started_at=s.started_at,
                finished_at=s.finished_at,
                detail=s.detail,
                records=s.records,
            )
            for s in result.steps
        ],
        briefing=BriefingRead.model_validate(result.briefing),
    )
