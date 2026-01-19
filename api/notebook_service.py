"""
Notebook service layer using API.
"""

from typing import List, Optional

from loguru import logger

from api.client import api_client
from open_notebook.domain.notebook import Notebook


class NotebookService:
    """Service layer for notebook operations using API."""
    
    def __init__(self):
        logger.info("Using API for notebook operations")
    
    def get_all_notebooks(self, order_by: str = "updated desc") -> List[Notebook]:
        """Get all notebooks."""
        notebooks_data = api_client.get_notebooks(order_by=order_by)
        # Convert API response to Notebook objects
        notebooks = []
        for nb_data in notebooks_data:
            nb = Notebook()
            nb.id = nb_data["id"]
            nb.created = nb_data["created"]
            nb.updated = nb_data["updated"]
            notebooks.append(nb)
        return notebooks
    
    def get_notebook(self, notebook_id: str) -> Optional[Notebook]:
        """Get a specific notebook."""
        response = api_client.get_notebook(notebook_id)
        nb_data = response if isinstance(response, dict) else response[0]
        nb = Notebook()
        nb.id = nb_data["id"]
        nb.created = nb_data["created"]
        nb.updated = nb_data["updated"]
        return nb


# Global service instance
notebook_service = NotebookService()