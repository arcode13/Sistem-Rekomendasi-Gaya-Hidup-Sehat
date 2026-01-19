import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncio

try:
    from trulens_eval import Tru, Feedback, TruCustomApp
    from trulens.providers.google import Google as TruGoogle
    TRULENS_AVAILABLE = True
except ImportError as e:
    TRULENS_AVAILABLE = False
    Tru = None
    Feedback = None
    TruCustomApp = None
    TruGoogle = None

app = FastAPI(title="TruLens Evaluation Service")

class EvaluationRequest(BaseModel):
    query: str
    context: str
    response: str
    app_id: str = "health_recommendation"

class EvaluationResponse(BaseModel):
    success: bool
    metrics: Dict[str, float]
    record_id: Optional[str] = None
    error: Optional[str] = None

class StatusResponse(BaseModel):
    success: bool
    initialized: bool
    trulens_available: bool

class TruLensService:
    def __init__(self):
        self.tru = None
        self.provider = None
        self.provider_name = "Google Gemini"
        self._initialized = False

    async def initialize(self):
        if self._initialized or not TRULENS_AVAILABLE:
            return
        
        try:
            google_api_key = os.getenv("GOOGLE_API_KEY")
            
            if not google_api_key:
                return
            
            try:
                gemini_model = os.getenv("GEMINI_MODEL", "").strip()
                if not gemini_model:
                    gemini_model = "gemini-2.5-flash"
                self.provider = TruGoogle(
                    api_key=google_api_key,
                    model_engine=gemini_model
                )
                self.provider_name = f"Google Gemini ({gemini_model})"
            except Exception as e:
                return
            
            self.tru = Tru()
            self._initialized = True
        except Exception as e:
            self._initialized = False

    def create_feedback_functions(self) -> List:
        if not self._initialized or not self.provider:
            return []
        
        feedbacks = []
        try:
            from trulens.core import Select
            
            f_context_relevance = (
                Feedback(self.provider.context_relevance, name="context_relevance")
                .on(Select.RecordInput)
                .on(Select.RecordCalls.rag_app.select_context.rets[:])
                .aggregate(lambda x: sum(x) / len(x) if x else 0)
            )
            feedbacks.append(f_context_relevance)
            
            f_answer_relevance = (
                Feedback(self.provider.relevance, name="answer_relevance")
                .on(Select.RecordInput)
                .on(Select.RecordOutput)
            )
            feedbacks.append(f_answer_relevance)
            
            f_groundedness = (
                Feedback(self.provider.groundedness_measure_with_cot_reasons, name="groundedness")
                .on(Select.RecordCalls.rag_app.select_context.rets[:])
                .on(Select.RecordOutput)
                .aggregate(lambda x: sum(x) / len(x) if x else 0)
            )
            feedbacks.append(f_groundedness)
        except Exception as e:
            pass
        
        return feedbacks

    async def evaluate(self, query: str, context: str, response: str, app_id: str) -> Dict[str, Any]:
        if not TRULENS_AVAILABLE:
            return {"success": False, "error": "TruLens not available", "metrics": {}}
        
        if not self._initialized:
            await self.initialize()
        
        if not self._initialized:
            return {"success": False, "error": "TruLens not initialized", "metrics": {}}
        
        try:
            metrics = {}
            metric_timeout = 50.0
            
            try:
                context_score = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.provider.context_relevance,
                        question=query,
                        context=context
                    ),
                    timeout=metric_timeout
                )
                metrics["context_relevance"] = float(context_score) if context_score is not None else 0.0
            except asyncio.TimeoutError:
                metrics["context_relevance"] = 0.0
            except Exception as e:
                metrics["context_relevance"] = 0.0
            
            try:
                answer_score = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.provider.relevance,
                        prompt=query,
                        response=response
                    ),
                    timeout=metric_timeout
                )
                metrics["answer_relevance"] = float(answer_score) if answer_score is not None else 0.0
            except asyncio.TimeoutError:
                metrics["answer_relevance"] = 0.0
            except Exception as e:
                metrics["answer_relevance"] = 0.0
            
            try:
                groundedness_score = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.provider.groundedness_measure_with_cot_reasons,
                        source=context,
                        statement=response
                    ),
                    timeout=metric_timeout
                )
                if isinstance(groundedness_score, tuple):
                    groundedness_score = groundedness_score[0]
                metrics["groundedness"] = float(groundedness_score) if groundedness_score is not None else 0.0
            except asyncio.TimeoutError:
                metrics["groundedness"] = 0.0
            except Exception as e:
                metrics["groundedness"] = 0.0
            
            return {
                "success": True,
                "metrics": metrics
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "metrics": {}
            }

trulens_service = TruLensService()

@app.on_event("startup")
async def startup_event():
    await trulens_service.initialize()

@app.get("/health")
async def health():
    return {"status": "ok", "service": "trulens-evaluation"}

@app.get("/status", response_model=StatusResponse)
async def get_status():
    return StatusResponse(
        success=True,
        initialized=trulens_service._initialized,
        trulens_available=TRULENS_AVAILABLE
    )

@app.post("/initialize")
async def initialize():
    await trulens_service.initialize()
    return {
        "message": "TruLens re-initialized"
    }

@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(request: EvaluationRequest):
    result = await trulens_service.evaluate(
        query=request.query,
        context=request.context,
        response=request.response,
        app_id=request.app_id
    )
    return EvaluationResponse(**result)