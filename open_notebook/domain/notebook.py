import asyncio
from typing import Any, ClassVar, Dict, List, Literal, Optional, Tuple, Union

from loguru import logger
from pydantic import BaseModel, Field, field_validator
from surreal_commands import submit_command
from surrealdb import RecordID

from open_notebook.database.repository import ensure_record_id, repo_query, repo_update
from open_notebook.domain.base import ObjectModel
from open_notebook.domain.models import model_manager
from open_notebook.exceptions import DatabaseOperationError, InvalidInputError
from open_notebook.utils import split_text
from datetime import datetime


class Notebook(ObjectModel):
    table_name: ClassVar[str] = "notebook"

    async def get_sources(self) -> List["Source"]:
        try:
            srcs = await repo_query(
                """
                select * omit source.full_text from (
                select in as source from reference where out=$id
                fetch source
            ) order by source.updated desc
            """,
                {"id": ensure_record_id(self.id)},
            )
            return [Source(**src["source"]) for src in srcs] if srcs else []
        except Exception as e:
            logger.error(f"Error fetching sources for notebook {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(e)

    @staticmethod
    async def update_timestamp(notebook_id: str) -> None:
        try:
            await repo_update(
                "notebook",
                ensure_record_id(notebook_id),
                {"updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
            )
        except Exception as e:
            logger.warning(f"Failed to update notebook timestamp for {notebook_id}: {str(e)}")

    @staticmethod
    async def update_timestamps_for_source(source_id: str) -> None:
        try:
            notebooks = await repo_query(
                """
                SELECT out as notebook_id FROM reference WHERE in = $source_id
                """,
                {"source_id": ensure_record_id(source_id)}
            )
            for nb in notebooks:
                if nb.get("notebook_id"):
                    await Notebook.update_timestamp(nb["notebook_id"])
        except Exception as e:
            logger.warning(f"Failed to update notebook timestamps for source {source_id}: {str(e)}")

    async def get_chat_sessions(self) -> List["ChatSession"]:
        try:
            srcs = await repo_query(
                """
                select * from (
                    select
                    <- chat_session as chat_session
                    from refers_to
                    where out=$id
                    fetch chat_session
                )
                order by chat_session.updated desc
            """,
                {"id": ensure_record_id(self.id)},
            )
            return (
                [ChatSession(**src["chat_session"][0]) for src in srcs] if srcs else []
            )
        except Exception as e:
            logger.error(
                f"Error fetching chat sessions for notebook {self.id}: {str(e)}"
            )
            logger.exception(e)
            raise DatabaseOperationError(e)


class Asset(BaseModel):
    file_path: Optional[str] = None
    url: Optional[str] = None


class SourceEmbedding(ObjectModel):
    table_name: ClassVar[str] = "source_embedding"
    content: str

    async def get_source(self) -> "Source":
        try:
            src = await repo_query(
                """
            select source.* from $id fetch source
            """,
                {"id": ensure_record_id(self.id)},
            )
            return Source(**src[0]["source"])
        except Exception as e:
            logger.error(f"Error fetching source for embedding {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(e)
class Source(ObjectModel):
    table_name: ClassVar[str] = "source"
    asset: Optional[Asset] = None
    title: Optional[str] = None
    topics: Optional[List[str]] = Field(default_factory=list)
    full_text: Optional[str] = None
    chat_include: Optional[str] = Field(default="full", description="Chat inclusion mode: 'off' or 'full'")
    command: Optional[Union[str, RecordID]] = Field(
        default=None, description="Link to surreal-commands processing job"
    )

    class Config:
        arbitrary_types_allowed = True

    @field_validator("command", mode="before")
    @classmethod
    def parse_command(cls, value):
        """Parse command field to ensure RecordID format"""
        if isinstance(value, str) and value:
            return ensure_record_id(value)
        return value

    @field_validator("id", mode="before")
    @classmethod
    def parse_id(cls, value):
        """Parse id field to handle both string and RecordID inputs"""
        if value is None:
            return None
        if isinstance(value, RecordID):
            return str(value)
        return str(value) if value else None

    async def get_status(self) -> Optional[str]:
        """Get the processing status of the associated command"""
        if not self.command:
            return None

        try:
            from surreal_commands import get_command_status

            status = await get_command_status(str(self.command))
            return status.status if status else "unknown"
        except Exception as e:
            logger.warning(f"Failed to get command status for {self.command}: {e}")
            return "unknown"

    async def get_processing_progress(self) -> Optional[Dict[str, Any]]:
        """Get detailed processing information for the associated command"""
        if not self.command:
            return None

        try:
            from surreal_commands import get_command_status

            status_result = await get_command_status(str(self.command))
            if not status_result:
                return None

            # Extract execution metadata if available
            result = getattr(status_result, "result", None)
            execution_metadata = result.get("execution_metadata", {}) if isinstance(result, dict) else {}

            return {
                "status": status_result.status,
                "started_at": execution_metadata.get("started_at"),
                "completed_at": execution_metadata.get("completed_at"),
                "error": getattr(status_result, "error_message", None),
                "result": result,
            }
        except Exception as e:
            logger.warning(f"Failed to get command progress for {self.command}: {e}")
            return None

    async def get_context(
        self, context_size: Literal["short", "long"] = "short"
    ) -> Dict[str, Any]:
        if context_size == "long":
            return dict(
                id=self.id,
                title=self.title,
                full_text=self.full_text,
            )
        else:
            return dict(id=self.id, title=self.title)

    async def get_embedded_chunks(self) -> int:
        try:
            result = await repo_query(
                """
                select count() as chunks from source_embedding where source=$id GROUP ALL
                """,
                {"id": ensure_record_id(self.id)},
            )
            if len(result) == 0:
                return 0
            return result[0]["chunks"]
        except Exception as e:
            logger.error(f"Error fetching chunks count for source {self.id}: {str(e)}")
            logger.exception(e)
            raise DatabaseOperationError(f"Failed to count chunks for source: {str(e)}")


    async def add_to_notebook(self, notebook_id: str) -> Any:
        if not notebook_id:
            raise InvalidInputError("Notebook ID must be provided")
        result = await self.relate("reference", notebook_id)
        await Notebook.update_timestamp(notebook_id)
        return result

    async def vectorize(self) -> str:
        """
        Submit vectorization as a background job using the vectorize_source command.

        This method now leverages the job-based architecture to prevent HTTP connection
        pool exhaustion when processing large documents. The actual chunk processing
        happens in the background worker pool, with natural concurrency control.

        Returns:
            str: The command/job ID that can be used to track progress via the commands API

        Raises:
            ValueError: If source has no text to vectorize
            DatabaseOperationError: If job submission fails
        """
        logger.info(f"Submitting vectorization job for source {self.id}")

        try:
            if not self.full_text:
                raise ValueError(f"Source {self.id} has no text to vectorize")

            # Submit the vectorize_source command which will:
            # 1. Delete existing embeddings (idempotency)
            # 2. Split text into chunks
            # 3. Submit each chunk as an embed_chunk job
            command_id = submit_command(
                "open_notebook",      # app name
                "vectorize_source",   # command name
                {
                    "source_id": str(self.id),
                }
            )

            command_id_str = str(command_id)
            logger.info(
                f"Vectorization job submitted for source {self.id}: "
                f"command_id={command_id_str}"
            )

            return command_id_str

        except Exception as e:
            logger.error(f"Failed to submit vectorization job for source {self.id}: {e}")
            logger.exception(e)
            raise DatabaseOperationError(e)


    def _prepare_save_data(self) -> dict:
        """Override to ensure command field is always RecordID format for database"""
        data = super()._prepare_save_data()

        # Ensure command field is RecordID format if not None
        if data.get("command") is not None:
            data["command"] = ensure_record_id(data["command"])

        return data


class ChatSession(ObjectModel):
    table_name: ClassVar[str] = "chat_session"
    title: Optional[str] = None
    model_override: Optional[str] = None

    async def relate_to_notebook(self, notebook_id: str) -> Any:
        if not notebook_id:
            raise InvalidInputError("Notebook ID must be provided")
        return await self.relate("refers_to", notebook_id)

    async def relate_to_source(self, source_id: str) -> Any:
        if not source_id:
            raise InvalidInputError("Source ID must be provided")
        return await self.relate("refers_to", source_id)

