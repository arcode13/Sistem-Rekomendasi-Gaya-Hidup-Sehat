import operator
from typing import Any, Dict, List, Optional

from content_core import extract_content
from content_core.common import ProcessSourceState
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from loguru import logger
from typing_extensions import Annotated, TypedDict

from open_notebook.domain.content_settings import ContentSettings
from open_notebook.domain.notebook import Asset, Source


class SourceState(TypedDict):
    content_state: ProcessSourceState
    source_id: str
    notebook_ids: List[str]
    source: Source
    embed: bool


async def content_process(state: SourceState) -> dict:
    content_settings = ContentSettings(
        default_content_processing_engine_doc="auto",
        default_content_processing_engine_url="auto",
        default_embedding_option="ask",
    )
    content_state: Dict[str, Any] = state["content_state"]

    content_state["document_engine"] = (
        content_settings.default_content_processing_engine_doc or "auto"
    )
    content_state["output_format"] = "markdown"

    processed_state = await extract_content(content_state)
    return {"content_state": processed_state}


async def save_source(state: SourceState) -> dict:
    content_state = state["content_state"]

    # Get existing source using the provided source_id
    source = await Source.get(state["source_id"])
    if not source:
        raise ValueError(f"Source with ID {state['source_id']} not found")

    # Update the source with processed content
    source.asset = Asset(
        url=getattr(content_state, "url", None),
        file_path=getattr(content_state, "file_path", None),
    )
    source.full_text = content_state.content
    
    # Preserve existing title if none provided in processed content
    if content_state.title:
        source.title = content_state.title
    
    await source.save()

    # NOTE: Notebook associations are created by the API immediately for UI responsiveness
    # No need to create them here to avoid duplicate edges

    if state["embed"]:
        logger.debug("Embedding content for vector search")
        await source.vectorize()

    return {"source": source}



# Create and compile the workflow
workflow = StateGraph(SourceState)

# Add nodes
workflow.add_node("content_process", content_process)
workflow.add_node("save_source", save_source)
# Define the graph edges
workflow.add_edge(START, "content_process")
workflow.add_edge("content_process", "save_source")
workflow.add_edge("save_source", END)

# Compile the graph
source_graph = workflow.compile()
