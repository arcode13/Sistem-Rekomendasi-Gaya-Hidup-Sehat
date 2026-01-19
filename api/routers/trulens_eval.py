from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from api.trulens_service import trulens_service
from api.trulens_config import get_trulens_enabled, set_trulens_enabled
from pydantic import BaseModel
import httpx
from open_notebook.database.repository import repo_query

router = APIRouter(prefix="/trulens", tags=["TruLens"])


class MetricSummary(BaseModel):
    avg: float
    min: float
    max: float
    count: int


class MetricsSummary(BaseModel):
    context_relevance: MetricSummary
    answer_relevance: MetricSummary
    groundedness: MetricSummary


class SummaryData(BaseModel):
    success: bool
    app_id: str
    total_evaluations: int
    metrics: MetricsSummary


class Evaluation(BaseModel):
    record_id: str
    app_id: str
    timestamp: str
    metrics: Dict[str, float]


class EvaluationsResponse(BaseModel):
    success: bool
    evaluations: List[Evaluation]


class TruLensStatusResponse(BaseModel):
    success: bool
    initialized: bool
    trulens_available: bool


class TruLensConfigResponse(BaseModel):
    success: bool
    enabled: bool


class TruLensConfigRequest(BaseModel):
    enabled: bool


@router.post("/initialize")
async def initialize_trulens():
    await trulens_service.initialize()
    return {"message": "TruLens service re-initialized."}


@router.get("/status", response_model=TruLensStatusResponse)
async def get_trulens_status():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{trulens_service.base_url}/status")
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch status from TruLens service")
            
            data = response.json()
            return TruLensStatusResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config", response_model=TruLensConfigResponse)
async def get_trulens_config():
    enabled = await get_trulens_enabled()
    return TruLensConfigResponse(success=True, enabled=enabled)


@router.post("/config", response_model=TruLensConfigResponse)
async def update_trulens_config(request: TruLensConfigRequest):
    enabled = await set_trulens_enabled(request.enabled)
    return TruLensConfigResponse(success=True, enabled=enabled)


@router.get("/metrics/summary", response_model=SummaryData)
async def get_metrics_summary(app_id: str = "health_recommendation"):
    try:
        enabled = await get_trulens_enabled()
        if not enabled:
            return SummaryData(
                success=True,
                app_id=app_id,
                total_evaluations=0,
                metrics=MetricsSummary(
                    context_relevance=MetricSummary(avg=0, min=0, max=0, count=0),
                    answer_relevance=MetricSummary(avg=0, min=0, max=0, count=0),
                    groundedness=MetricSummary(avg=0, min=0, max=0, count=0),
                ),
            )

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{trulens_service.base_url}/metrics/summary",
                params={"app_id": app_id}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch metrics from TruLens service")
            
            data = response.json()
            return SummaryData(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/evaluations", response_model=EvaluationsResponse)
async def get_evaluations(app_id: str = "health_recommendation", limit: int = 50):
    try:
        enabled = await get_trulens_enabled()
        if not enabled:
            return EvaluationsResponse(success=True, evaluations=[])

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{trulens_service.base_url}/evaluations",
                params={"app_id": app_id, "limit": limit}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch evaluations from TruLens service")
            
            data = response.json()
            evaluations = [Evaluation(**ev) for ev in data.get("evaluations", [])]
            return EvaluationsResponse(success=True, evaluations=evaluations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leaderboard")
async def get_leaderboard(app_id: str = "health_recommendation"):
    return {"success": True, "leaderboard": [], "message": "Leaderboard not implemented in microservice mode"}


@router.get("/metrics/aggregated")
async def get_aggregated_metrics():
    try:
        enabled = await get_trulens_enabled()
        if not enabled:
            empty_metrics = {
                "context_relevance": {"avg": 0, "min": 0, "max": 0, "count": 0},
                "answer_relevance": {"avg": 0, "min": 0, "max": 0, "count": 0},
                "groundedness": {"avg": 0, "min": 0, "max": 0, "count": 0},
            }
            return {
                "success": True,
                "enabled": False,
                "total_evaluations": 0,
                "metrics": empty_metrics,
            }

        sessions = await repo_query("SELECT * FROM health_chat_session")
        
        all_metrics = {
            "context_relevance": [],
            "answer_relevance": [],
            "groundedness": []
        }
        
        total_evaluations = 0
        
        for session in sessions:
            messages = session.get("messages", [])
            for msg in messages:
                if msg.get("type") == "bot" and msg.get("evaluation_metrics"):
                    metrics = msg.get("evaluation_metrics", {})
                    for key in all_metrics.keys():
                        if key in metrics:
                            all_metrics[key].append(metrics[key])
                            total_evaluations += 1
        
        metrics_data = {}
        for metric_name, values in all_metrics.items():
            if values:
                metrics_data[metric_name] = {
                    "avg": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values)
                }
            else:
                metrics_data[metric_name] = {"avg": 0, "min": 0, "max": 0, "count": 0}
        
        return {
            "success": True,
            "enabled": True,
            "total_evaluations": total_evaluations // 3 if total_evaluations > 0 else 0,
            "metrics": metrics_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


