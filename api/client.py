import os
from typing import Any, Dict, List, Optional, Union

import httpx
from loguru import logger


class APIClient:
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv("API_BASE_URL", "http://127.0.0.1:5055")
        timeout_str = os.getenv("API_CLIENT_TIMEOUT", "300.0")
        try:
            timeout_value = float(timeout_str)
            if timeout_value < 30:
                logger.warning(f"API_CLIENT_TIMEOUT={timeout_value}s is too low, using minimum of 30s")
                timeout_value = 30.0
            elif timeout_value > 3600:
                logger.warning(f"API_CLIENT_TIMEOUT={timeout_value}s is too high, using maximum of 3600s")
                timeout_value = 3600.0
            self.timeout = timeout_value
        except ValueError:
            logger.error(f"Invalid API_CLIENT_TIMEOUT value '{timeout_str}', using default 300s")
            self.timeout = 300.0

        self.headers = {}

    def _make_request(
        self, method: str, endpoint: str, timeout: Optional[float] = None, **kwargs
    ) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        url = f"{self.base_url}{endpoint}"
        request_timeout = timeout if timeout is not None else self.timeout
        
        headers = kwargs.get("headers", {})
        headers.update(self.headers)
        kwargs["headers"] = headers

        try:
            with httpx.Client(timeout=request_timeout) as client:
                response = client.request(method, url, **kwargs)
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as e:
            logger.error(f"Request error for {method} {url}: {str(e)}")
            raise ConnectionError(f"Failed to connect to API: {str(e)}")
        except httpx.HTTPStatusError as e:
            logger.error(
                f"HTTP error {e.response.status_code} for {method} {url}: {e.response.text}"
            )
            raise RuntimeError(
                f"API request failed: {e.response.status_code} - {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error for {method} {url}: {str(e)}")
            raise

    def get_notebooks(
        self, order_by: str = "updated desc"
    ) -> List[Dict[Any, Any]]:
        params: Dict[str, Any] = {"order_by": order_by}

        result = self._make_request("GET", "/api/notebooks", params=params)
        return result if isinstance(result, list) else [result]

    def get_notebook(self, notebook_id: str) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("GET", f"/api/notebooks/{notebook_id}")

    def get_models(self, model_type: Optional[str] = None) -> List[Dict[Any, Any]]:
        params = {}
        if model_type:
            params["type"] = model_type
        result = self._make_request("GET", "/api/models", params=params)
        return result if isinstance(result, list) else [result]

    def create_model(self, name: str, provider: str, model_type: str) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        data = {
            "name": name,
            "provider": provider,
            "type": model_type,
        }
        return self._make_request("POST", "/api/models", json=data)

    def delete_model(self, model_id: str) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("DELETE", f"/api/models/{model_id}")

    def get_default_models(self) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("GET", "/api/models/defaults")

    def update_default_models(self, **defaults) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("PUT", "/api/models/defaults", json=defaults)

    def embed_content(self, item_id: str, item_type: str, async_processing: bool = False) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        data = {
            "item_id": item_id,
            "item_type": item_type,
            "async_processing": async_processing,
        }
        return self._make_request("POST", "/api/embed", json=data, timeout=self.timeout)

    def rebuild_embeddings(
        self,
        mode: str = "existing",
        include_sources: bool = True
    ) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        data = {
            "mode": mode,
            "include_sources": include_sources,
        }
        rebuild_timeout = max(self.timeout, min(self.timeout * 2, 3600.0))
        return self._make_request("POST", "/api/embeddings/rebuild", json=data, timeout=rebuild_timeout)

    def get_rebuild_status(self, command_id: str) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("GET", f"/api/embeddings/rebuild/{command_id}/status")

    def get_settings(self) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("GET", "/api/settings")

    def update_settings(self, **settings) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("PUT", "/api/settings", json=settings)

    def get_notebook_context(
        self, notebook_id: str, context_config: Optional[Dict] = None
    ) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        data: Dict[str, Any] = {"notebook_id": notebook_id}
        if context_config:
            data["context_config"] = context_config
        result = self._make_request(
            "POST", f"/api/notebooks/{notebook_id}/context", json=data
        )
        return result if isinstance(result, dict) else {}

    def get_sources(self, notebook_id: Optional[str] = None) -> List[Dict[Any, Any]]:
        params = {}
        if notebook_id:
            params["notebook_id"] = notebook_id
        result = self._make_request("GET", "/api/sources", params=params)
        return result if isinstance(result, list) else [result]

    def create_source(
        self,
        notebook_id: Optional[str] = None,
        notebooks: Optional[List[str]] = None,
        source_type: str = "text",
        url: Optional[str] = None,
        file_path: Optional[str] = None,
        content: Optional[str] = None,
        title: Optional[str] = None,
        embed: bool = False,
        delete_source: bool = False,
        async_processing: bool = False,
    ) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        data = {
            "type": source_type,
            "embed": embed,
            "delete_source": delete_source,
            "async_processing": async_processing,
        }

        if notebooks:
            data["notebooks"] = notebooks
        elif notebook_id:
            data["notebook_id"] = notebook_id
        else:
            raise ValueError("Either notebook_id or notebooks must be provided")

        if url:
            data["url"] = url
        if file_path:
            data["file_path"] = file_path
        if content:
            data["content"] = content
        if title:
            data["title"] = title

        return self._make_request("POST", "/api/sources/json", json=data, timeout=self.timeout)

    def get_source(self, source_id: str) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("GET", f"/api/sources/{source_id}")

    def get_source_status(self, source_id: str) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("GET", f"/api/sources/{source_id}/status")

    def update_source(self, source_id: str, **updates) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("PUT", f"/api/sources/{source_id}", json=updates)

    def delete_source(self, source_id: str) -> Union[Dict[Any, Any], List[Dict[Any, Any]]]:
        return self._make_request("DELETE", f"/api/sources/{source_id}")


api_client = APIClient()
