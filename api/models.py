from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


# Notebook models
class NotebookResponse(BaseModel):
    id: str
    created: str
    updated: str
    source_count: int


# Models API models
class ModelCreate(BaseModel):
    name: str = Field(..., description="Model name (e.g., gpt-5-mini, gemini)")
    provider: str = Field(
        ..., description="Provider name (e.g., openai, google, ollama)"
    )
    type: str = Field(
        ...,
        description="Model type (language or embedding)",
    )


class ModelResponse(BaseModel):
    id: str
    name: str
    provider: str
    type: str
    created: str
    updated: str


class DefaultModelsResponse(BaseModel):
    default_chat_model: Optional[str] = None
    large_context_model: Optional[str] = None
    default_embedding_model: Optional[str] = None


class ProviderAvailabilityResponse(BaseModel):
    available: List[str] = Field(..., description="List of available providers")
    unavailable: List[str] = Field(..., description="List of unavailable providers")
    supported_types: Dict[str, List[str]] = Field(
        ..., description="Provider to supported model types mapping"
    )


# Embedding API models
class EmbedRequest(BaseModel):
    item_id: str = Field(..., description="ID of the item to embed")
    item_type: str = Field(..., description="Type of item (source)")
    async_processing: bool = Field(
        False, description="Process asynchronously in background"
    )


class EmbedResponse(BaseModel):
    success: bool = Field(..., description="Whether embedding was successful")
    message: str = Field(..., description="Result message")
    item_id: str = Field(..., description="ID of the item that was embedded")
    item_type: str = Field(..., description="Type of item that was embedded")
    command_id: Optional[str] = Field(
        None, description="Command ID for async processing"
    )


# Rebuild request/response models
class RebuildRequest(BaseModel):
    mode: Literal["existing", "all"] = Field(
        ...,
        description="Rebuild mode: 'existing' only re-embeds items with embeddings, 'all' embeds everything",
    )
    include_sources: bool = Field(True, description="Include sources in rebuild")


class RebuildResponse(BaseModel):
    command_id: str = Field(..., description="Command ID to track progress")
    total_items: int = Field(..., description="Estimated number of items to process")
    message: str = Field(..., description="Status message")


class RebuildProgress(BaseModel):
    processed: int = Field(..., description="Number of items processed")
    total: int = Field(..., description="Total items to process")
    percentage: float = Field(..., description="Progress percentage")


class RebuildStats(BaseModel):
    sources: int = Field(0, description="Sources processed")
    failed: int = Field(0, description="Failed items")


class RebuildStatusResponse(BaseModel):
    command_id: str = Field(..., description="Command ID")
    status: str = Field(..., description="Status: queued, running, completed, failed")
    progress: Optional[RebuildProgress] = None
    stats: Optional[RebuildStats] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None


# Settings API models
class SettingsResponse(BaseModel):
    default_content_processing_engine_doc: Optional[str] = None
    default_embedding_option: Optional[str] = None


class SettingsUpdate(BaseModel):
    default_content_processing_engine_doc: Optional[str] = None
    default_embedding_option: Optional[str] = None


# Sources API models
class AssetModel(BaseModel):
    file_path: Optional[str] = None
    url: Optional[str] = None


class SourceCreate(BaseModel):
    # Backward compatibility: support old single notebook_id
    notebook_id: Optional[str] = Field(
        None, description="Notebook ID to add the source to (deprecated, use notebooks)"
    )
    # New multi-notebook support
    notebooks: Optional[List[str]] = Field(
        None, description="List of notebook IDs to add the source to"
    )
    # Required fields
    type: Literal["upload"] = Field(
        ..., description="Source type: upload (PDF only)"
    )
    file_path: Optional[str] = Field(None, description="File path for upload type")
    content: Optional[str] = Field(None, description="Text content for text type")
    title: Optional[str] = Field(None, description="Source title")
    embed: bool = Field(False, description="Whether to embed content for vector search")
    delete_source: bool = Field(
        False, description="Whether to delete uploaded file after processing"
    )
    # New async processing support
    async_processing: bool = Field(
        False, description="Whether to process source asynchronously"
    )

    @model_validator(mode="after")
    def validate_notebook_fields(self):
        # Ensure only one of notebook_id or notebooks is provided
        if self.notebook_id is not None and self.notebooks is not None:
            raise ValueError(
                "Cannot specify both 'notebook_id' and 'notebooks'. Use 'notebooks' for multi-notebook support."
            )

        # Convert single notebook_id to notebooks array for internal processing
        if self.notebook_id is not None:
            self.notebooks = [self.notebook_id]
            # Keep notebook_id for backward compatibility in response

        # Set empty array if no notebooks specified (allow sources without notebooks)
        if self.notebooks is None:
            self.notebooks = []

        return self

class SourceUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Source title")
    topics: Optional[List[str]] = Field(None, description="Source topics")
    chat_include: Optional[str] = Field(None, description="Chat inclusion mode: 'off' or 'full'")

class SourceResponse(BaseModel):
    id: str
    title: Optional[str]
    topics: Optional[List[str]]
    asset: Optional[AssetModel]
    full_text: Optional[str]
    embedded: bool
    embedded_chunks: int
    file_available: Optional[bool] = None
    created: str
    updated: str
    chat_include: Optional[str] = None
    # New fields for async processing
    command_id: Optional[str] = None
    status: Optional[str] = None
    processing_info: Optional[Dict] = None
    # Notebook associations
    notebooks: Optional[List[str]] = None

class SourceListResponse(BaseModel):
    id: str
    title: Optional[str]
    topics: Optional[List[str]]
    asset: Optional[AssetModel]
    embedded: bool  # Boolean flag indicating if source has embeddings
    embedded_chunks: int  # Number of embedded chunks
    created: str
    updated: str
    file_available: Optional[bool] = None
    chat_include: Optional[str] = None
    # Status fields for async processing
    command_id: Optional[str] = None
    status: Optional[str] = None
    processing_info: Optional[Dict[str, Any]] = None

# Context API models
class ContextConfig(BaseModel):
    sources: Dict[str, str] = Field(
        default_factory=dict, description="Source inclusion config {source_id: level}"
    )

class ContextRequest(BaseModel):
    notebook_id: str = Field(..., description="Notebook ID to get context for")
    context_config: Optional[ContextConfig] = Field(
        None, description="Context configuration"
    )

class ContextResponse(BaseModel):
    notebook_id: str
    sources: List[Dict[str, Any]] = Field(..., description="Source context data")
    total_tokens: Optional[int] = Field(None, description="Estimated token count")


# Source status response
class SourceStatusResponse(BaseModel):
    status: Optional[str] = Field(None, description="Processing status")
    message: str = Field(..., description="Descriptive message about the status")
    processing_info: Optional[Dict[str, Any]] = Field(
        None, description="Detailed processing information"
    )
    command_id: Optional[str] = Field(None, description="Command ID if available")

# Health API models
class HealthPredictionRequest(BaseModel):
    age: int = Field(..., description="Age in years (20-70)", ge=20, le=70)
    gender: int = Field(..., description="Gender: 1=Female, 2=Male")
    height: float = Field(..., description="Height in cm (140-220)", ge=140, le=220)
    weight: float = Field(..., description="Weight in kg (40-200)", ge=40, le=200)
    systolic_blood_pressure: int = Field(
        ..., description="Systolic blood pressure in mmHg (60-250)", ge=60, le=250
    )
    diastolic_blood_pressure: int = Field(
        ..., description="Diastolic blood pressure in mmHg (40-200)", ge=40, le=200
    )
    cholesterol: Optional[int] = Field(
        None, description="Cholesterol: 1=normal, 2=above normal, 3=well above normal"
    )
    glucose: Optional[int] = Field(
        None, description="Glucose: 1=normal, 2=above normal, 3=well above normal"
    )
    smoking: Optional[int] = Field(None, description="Smoking: 0=no, 1=yes")
    alcohol: Optional[int] = Field(None, description="Alcohol intake: 0=no, 1=yes")
    physical_activity: Optional[int] = Field(None, description="Physical activity: 0=inactive, 1=active")

    @model_validator(mode="after")
    def validate_blood_pressure(self):
        if self.systolic_blood_pressure <= self.diastolic_blood_pressure:
            raise ValueError(
                "Systolic blood pressure must be greater than diastolic blood pressure"
            )
        if self.gender not in [1, 2]:
            raise ValueError("Gender must be 1 (Female) or 2 (Male)")
        if self.cholesterol is not None and self.cholesterol not in [1, 2, 3]:
            raise ValueError("Cholesterol must be 1, 2, or 3")
        if self.glucose is not None and self.glucose not in [1, 2, 3]:
            raise ValueError("Glucose must be 1, 2, or 3")
        if self.smoking is not None and self.smoking not in [0, 1]:
            raise ValueError("Smoking must be 0 or 1")
        if self.alcohol is not None and self.alcohol not in [0, 1]:
            raise ValueError("Alcohol must be 0 or 1")
        if self.physical_activity is not None and self.physical_activity not in [0, 1]:
            raise ValueError("Physical activity must be 0 or 1")
        return self


class HealthPredictionResponse(BaseModel):
    success: bool
    data: Dict[str, Any] = Field(
        ...,
        description="Prediction results including risk_level, probabilities, bmi, etc.",
    )
    examination_id: Optional[str] = Field(
        None, description="ID of the saved health examination record"
    )


class HealthReferenceItem(BaseModel):
    number: int = Field(..., description="Reference number")
    type: str = Field(..., description="Reference type (source)")
    id: str = Field(..., description="Reference ID")
    title: str = Field(..., description="Reference title")


class HealthRecommendationRequest(BaseModel):
    age: int
    gender: int
    height: float
    weight: float
    systolic_blood_pressure: int
    diastolic_blood_pressure: int
    bmi: float
    risk_level: str = Field(..., description="Risk level: low, medium, or high")
    prob_disease: float
    cholesterol: Optional[int] = None
    glucose: Optional[int] = None
    smoking: Optional[int] = None
    alcohol: Optional[int] = None
    physical_activity: Optional[int] = None


class HealthRecommendationResponse(BaseModel):
    success: bool
    recommendation: str = Field(..., description="LLM generated health recommendation")
    error: Optional[str] = None
    processed_content: Optional[str] = Field(
        None, description="Processed content with numbered references"
    )
    references: Optional[List[HealthReferenceItem]] = Field(
        None, description="List of references with titles"
    )
    evaluation_metrics: Optional[Dict[str, float]] = Field(
        None, description="TruLens evaluation metrics"
    )
    meets_threshold: Optional[bool] = Field(
        None, description="Whether evaluation metrics meet threshold requirements"
    )
    threshold_warning: Optional[str] = Field(
        None, description="Warning message if threshold is not met"
    )


class HealthChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    risk_level: str = Field(..., description="Current risk level")
    patient_data: Optional[Dict[str, Any]] = Field(
        None, description="Patient examination data"
    )
    examination_id: Optional[str] = Field(
        None, description="ID of the health examination to link chat session"
    )
    session_id: Optional[str] = Field(
        None, description="ID of existing chat session (if continuing conversation)"
    )
    recommendation: Optional[str] = Field(
        None, description="Initial recommendation to save in session (when creating new session)"
    )
    recommendation_processed_content: Optional[str] = Field(
        None, description="Processed recommendation content with reference links"
    )
    recommendation_references: Optional[List[Dict[str, Any]]] = Field(
        None, description="List of references in the recommendation"
    )
    recommendation_evaluation_metrics: Optional[Dict[str, float]] = Field(
        None, description="TruLens evaluation metrics for recommendation"
    )


class HealthChatResponse(BaseModel):
    success: bool
    answer: str = Field(..., description="LLM generated answer")
    error: Optional[str] = None
    session_id: Optional[str] = Field(
        None, description="ID of the chat session (for continuing conversation)"
    )
    processed_content: Optional[str] = Field(
        None, description="Processed content with numbered references"
    )
    references: Optional[List[HealthReferenceItem]] = Field(
        None, description="List of references with titles"
    )
    evaluation_metrics: Optional[Dict[str, float]] = Field(
        None, description="TruLens evaluation metrics"
    )
    meets_threshold: Optional[bool] = Field(
        None, description="Whether evaluation metrics meet threshold requirements"
    )
    threshold_warning: Optional[str] = Field(
        None, description="Warning message if threshold is not met"
    )


class HealthChatSessionItem(BaseModel):
    id: str = Field(..., description="Session ID (without table prefix)")
    title: Optional[str] = Field(None, description="Session title shown in sidebar")
    examination_id: Optional[str] = Field(
        None, description="Associated health examination ID (without table prefix)"
    )
    created: Optional[str] = Field(None, description="Session creation timestamp")
    updated: Optional[str] = Field(None, description="Session last update timestamp")


class HealthChatSessionListResponse(BaseModel):
    sessions: List[HealthChatSessionItem] = Field(
        ..., description="List of health chat sessions"
    )


class HealthChatSessionDetailResponse(BaseModel):
    id: str = Field(..., description="Session ID (without table prefix)")
    title: Optional[str] = Field(None, description="Session title shown in sidebar")
    examination_id: Optional[str] = Field(
        None, description="Associated health examination ID (without table prefix)"
    )
    messages: List[Dict[str, Any]] = Field(
        default_factory=list, description="Chat messages for this session"
    )
    created: Optional[str] = Field(None, description="Session creation timestamp")
    updated: Optional[str] = Field(None, description="Session last update timestamp")


# Auth / user API models
class UserRegisterRequest(BaseModel):
    name: Optional[str] = Field(None, description="Full name")
    email: str = Field(..., description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    gender: Optional[int] = Field(None, description="Gender (1=Perempuan, 2=Laki-laki)")
    password: str = Field(..., description="Plain text password")


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="Email address")
    password: str = Field(..., description="Plain text password")


class UserResponse(BaseModel):
    id: str = Field(..., description="User ID")
    name: Optional[str] = Field(None, description="Full name")
    email: str = Field(..., description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    gender: Optional[int] = Field(None, description="Gender (1=Perempuan, 2=Laki-laki)")
    is_active: bool = Field(True, description="User active status")
    role: Optional[str] = Field("Pasien", description="User role (Pasien or Perawat)")
    created: Optional[str] = Field(None, description="Creation timestamp")
    updated: Optional[str] = Field(None, description="Update timestamp")


class UserLoginResponse(BaseModel):
    user: UserResponse
    token: str = Field(..., description="Simple token representing the current user")


class UserUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, description="Full name")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    gender: Optional[int] = Field(None, description="Gender (1=Perempuan, 2=Laki-laki)")
    password: Optional[str] = Field(None, description="New password")
    is_active: Optional[bool] = Field(None, description="User active status")
    role: Optional[str] = Field(None, description="User role (Pasien or Perawat)")


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., description="Email address")


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., description="New password")


class UserCreateRequest(BaseModel):
    name: Optional[str] = Field(None, description="Full name")
    email: str = Field(..., description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    gender: Optional[int] = Field(None, description="Gender (1=Perempuan, 2=Laki-laki)")
    password: str = Field(..., description="Password")
    role: str = Field("Pasien", description="User role (Pasien or Perawat)")


class UserListResponse(BaseModel):
    users: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    limit: int = Field(..., description="Number of items per page")
    offset: int = Field(..., description="Number of items skipped")


class ChatListItem(BaseModel):
    id: str = Field(..., description="Examination ID")
    user_id: Optional[str] = Field(None, description="User ID")
    user_name: Optional[str] = Field(None, description="User name")
    age: int = Field(..., description="Age")
    gender: int = Field(..., description="Gender")
    risk_level: str = Field(..., description="Risk level")
    prediction_proba: float = Field(..., description="Prediction probability")
    created: str = Field(..., description="Creation timestamp")
    updated: str = Field(..., description="Update timestamp")


class ChatListResponse(BaseModel):
    chats: List[ChatListItem] = Field(..., description="List of chat examinations")
    total: int = Field(..., description="Total number of chats")
    limit: int = Field(..., description="Number of items per page")
    offset: int = Field(..., description="Number of items skipped")


class ChatDetailResponse(BaseModel):
    examination: Dict[str, Any] = Field(..., description="Examination data")
    chat_sessions: List[Dict[str, Any]] = Field(default_factory=list, description="Chat sessions for this examination")
    phone: Optional[str] = Field(None, description="Phone number")
    gender: Optional[int] = Field(None, description="Gender (1=Perempuan, 2=Laki-laki)")
    password: Optional[str] = Field(None, description="New plain text password")


class HealthChatSessionUpdateRequest(BaseModel):
    title: str = Field(..., description="New title for the chat session")


# Error response
class ErrorResponse(BaseModel):
    error: str
    message: str
