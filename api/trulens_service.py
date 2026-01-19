from typing import Dict, Any
import os
import httpx
from loguru import logger

TRULENS_SERVICE_URL = os.getenv("TRULENS_SERVICE_URL", "http://trulens_service:5056")


class TruLensServiceClient:
    def __init__(self):
        self.base_url = TRULENS_SERVICE_URL
        self._initialized = False

    async def initialize(self):
        if self._initialized:
            return
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/status")
                if response.status_code == 200:
                    data = response.json()
                    self._initialized = data.get("initialized", False)
                    logger.info(f"TruLens service connected")
                else:
                    logger.warning(f"TruLens service returned status {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to connect to TruLens service: {str(e)}")
            self._initialized = False
    
    async def evaluate_rag(
        self,
        query: str,
        context: str,
        response: str,
        app_id: str = "health_recommendation"
    ) -> Dict[str, Any]:
        if not self._initialized:
            await self.initialize()
        
        if not self._initialized:
            return {
                "success": False,
                "error": "TruLens service not available",
                "metrics": {}
            }
        
        timeout_duration = 180.0 if app_id == "health_recommendation" else 120.0 if app_id == "health_chat" else 60.0
        
        try:
            async with httpx.AsyncClient(timeout=timeout_duration) as client:
                payload = {
                    "query": query,
                    "context": context,
                    "response": response,
                    "app_id": app_id
                }
                response_data = await client.post(f"{self.base_url}/evaluate", json=payload)
                
                if response_data.status_code == 200:
                    return response_data.json()
                else:
                    return {
                        "success": False,
                        "error": f"Service returned status {response_data.status_code}",
                        "metrics": {}
                    }
        except httpx.TimeoutException as e:
            return {
                "success": False,
                "error": f"Request timeout after {timeout_duration}s",
                "metrics": {}
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "metrics": {}
            }


trulens_service = TruLensServiceClient()
