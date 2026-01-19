# API Reference

Open Notebook provides a comprehensive REST API for programmatic access to all functionality. This document covers all available endpoints, authentication, request/response formats, and usage examples.

## 🔗 Base Information

- **Base URL**: `http://localhost:5055` (default development)
- **Content Type**: `application/json`
- **Authentication**: Optional password-based authentication
- **API Version**: v0.2.2

## 🔐 Authentication

Open Notebook supports optional password-based authentication via the `APP_PASSWORD` environment variable.

### Authentication Header

```bash
# If APP_PASSWORD is set
curl -H "Authorization: Bearer YOUR_PASSWORD" \
  http://localhost:5055/api/notebooks
```

### Authentication Responses

**401 Unauthorized**:
```json
{
  "detail": "Authentication required"
}
```

## 📚 Notebooks API

Manage notebook collections and organization.

### GET /api/notebooks

Get all notebooks with optional filtering and ordering.

**Query Parameters**:
- `order_by` (string, optional): Order by field and direction (default: "updated desc")

**Response**:
```json
[
  {
    "id": "notebook:uuid",
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z",
    "source_count": 5,
    "note_count": 3
  }
]
```

**Example**:
```bash
curl -X GET "http://localhost:5055/api/notebooks?order_by=updated desc"
```

### GET /api/notebooks/{notebook_id}

Get a specific notebook by ID.

**Path Parameters**:
- `notebook_id` (string): Notebook ID

**Response**: Same as GET list response

## 📄 Sources API

Manage content sources within notebooks.

### POST /api/sources

Create a new source.

**Request Body**:
```json
{
  "notebook_id": "notebook:uuid",
  "type": "text",
  "content": "Key findings from today's research session.",
  "title": "Optional title",
  "transformations": ["transformation:uuid"],
  "embed": true,
  "delete_source": false
}
```

**Source Types**:
- `upload`: Document/image upload (PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, EPUB, TXT, MD, JPG/PNG)
- `text`: Direct text content

**Response**:
```json
{
  "id": "source:uuid",
  "title": "Article Title",
  "topics": ["AI", "Machine Learning"],
  "asset": {
    "file_path": "/app/uploads/article.pdf"
  },
  "full_text": "Article content...",
  "embedded_chunks": 15,
  "created": "2024-01-01T00:00:00Z",
  "updated": "2024-01-01T00:00:00Z"
}
```

### GET /api/sources

Get all sources with optional filtering.

**Query Parameters**:
- `notebook_id` (string, optional): Filter by notebook
- `limit` (integer, optional): Maximum results (default: 100)
- `offset` (integer, optional): Pagination offset

**Response**:
```json
[
  {
    "id": "source:uuid",
    "title": "Article Title",
    "topics": ["AI"],
    "asset": {
      "file_path": "/app/uploads/article.pdf"
    },
    "embedded_chunks": 15,
    "insights_count": 3,
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z"
  }
]
```

### GET /api/sources/{source_id}

Get a specific source by ID.

**Path Parameters**:
- `source_id` (string): Source ID

**Response**: Same as POST response

### PUT /api/sources/{source_id}

Update a source.

**Path Parameters**:
- `source_id` (string): Source ID

**Request Body** (all fields optional):
```json
{
  "title": "Updated Title",
  "topics": ["Updated", "Topics"]
}
```

**Response**: Same as GET single source

### DELETE /api/sources/{source_id}

Delete a source.

**Path Parameters**:
- `source_id` (string): Source ID

**Response**:
```json
{
  "message": "Source deleted successfully"
}
```

## 📝 Notes API

Manage notes within notebooks.

### POST /api/notes

Create a new note.

**Request Body**:
```json
{
  "title": "Note Title",
  "content": "Note content",
  "note_type": "human",
  "notebook_id": "notebook:uuid"
}
```

**Note Types**:
- `human`: Manual note
- `ai`: AI-generated note

**Response**:
```json
{
  "id": "note:uuid",
  "title": "Note Title",
  "content": "Note content",
  "note_type": "human",
  "created": "2024-01-01T00:00:00Z",
  "updated": "2024-01-01T00:00:00Z"
}
```

### GET /api/notes

Get all notes with optional filtering.

**Query Parameters**:
- `notebook_id` (string, optional): Filter by notebook
- `note_type` (string, optional): Filter by note type
- `limit` (integer, optional): Maximum results

**Response**: Array of note objects

### GET /api/notes/{note_id}

Get a specific note by ID.

**Path Parameters**:
- `note_id` (string): Note ID

**Response**: Same as POST response

### PUT /api/notes/{note_id}

Update a note.

**Path Parameters**:
- `note_id` (string): Note ID

**Request Body** (all fields optional):
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "note_type": "ai"
}
```

**Response**: Same as GET single note

### DELETE /api/notes/{note_id}

Delete a note.

**Path Parameters**:
- `note_id` (string): Note ID

**Response**:
```json
{
  "message": "Note deleted successfully"
}
```

## 🤖 Models API

Manage AI models and configurations.

### GET /api/models

Get all configured models.

**Response**:
```json
[
  {
    "id": "model:uuid",
    "name": "gpt-5-mini",
    "provider": "openai",
    "type": "language",
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/models

Create a new model configuration.

**Request Body**:
```json
{
  "name": "gpt-5-mini",
  "provider": "openai",
  "type": "language"
}
```

**Model Types**:
- `language`: Text generation models
- `embedding`: Vector embedding models

**Response**: Same as GET single model

### GET /api/models/{model_id}

Get a specific model by ID.

**Path Parameters**:
- `model_id` (string): Model ID

**Response**: Same as POST response

### DELETE /api/models/{model_id}

Delete a model configuration.

**Path Parameters**:
- `model_id` (string): Model ID

**Response**:
```json
{
  "message": "Model deleted successfully"
}
```

### GET /api/models/defaults

Get default model configurations.

**Response**:
```json
{
  "default_chat_model": "model:gpt-5-mini",
  "default_transformation_model": "model:gpt-5-mini",
  "large_context_model": "model:gpt-5-mini",
  "default_embedding_model": "model:text-embedding-3-small",
}
```

## 🔧 Transformations API

Manage content transformations and AI-powered analysis.

### GET /api/transformations

Get all transformations.

**Response**:
```json
[
  {
    "id": "transformation:uuid",
    "name": "summarize",
    "title": "Summarize Content",
    "description": "Create a concise summary",
    "prompt": "Summarize the following content...",
    "apply_default": true,
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/transformations

Create a new transformation.

**Request Body**:
```json
{
  "name": "custom_analysis",
  "title": "Custom Analysis",
  "description": "Perform custom content analysis",
  "prompt": "Analyze the following content for key themes...",
  "apply_default": false
}
```

**Response**: Same as GET single transformation

### GET /api/transformations/{transformation_id}

Get a specific transformation by ID.

**Path Parameters**:
- `transformation_id` (string): Transformation ID

**Response**: Same as POST response

### PUT /api/transformations/{transformation_id}

Update a transformation.

**Path Parameters**:
- `transformation_id` (string): Transformation ID

**Request Body** (all fields optional):
```json
{
  "name": "updated_name",
  "title": "Updated Title",
  "description": "Updated description",
  "prompt": "Updated prompt...",
  "apply_default": true
}
```

**Response**: Same as GET single transformation

### DELETE /api/transformations/{transformation_id}

Delete a transformation.

**Path Parameters**:
- `transformation_id` (string): Transformation ID

**Response**:
```json
{
  "message": "Transformation deleted successfully"
}
```

### POST /api/transformations/execute

Execute a transformation on content.

**Request Body**:
```json
{
  "transformation_id": "transformation:uuid",
  "input_text": "Content to transform...",
  "model_id": "model:gpt-5-mini"
}
```

**Response**:
```json
{
  "output": "Transformed content...",
  "transformation_id": "transformation:uuid",
  "model_id": "model:gpt-5-mini"
}
```

## 📊 Insights API

Manage AI-generated insights for sources.

### GET /api/sources/{source_id}/insights

Get insights for a specific source.

**Path Parameters**:
- `source_id` (string): Source ID

**Response**:
```json
[
  {
    "id": "insight:uuid",
    "source_id": "source:uuid",
    "insight_type": "summary",
    "content": "This source discusses...",
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/sources/{source_id}/insights

Create a new insight for a source.

**Path Parameters**:
- `source_id` (string): Source ID

**Request Body**:
```json
{
  "transformation_id": "transformation:uuid",
  "model_id": "model:gpt-5-mini"
}
```

**Response**: Same as GET insight

### POST /api/insights/{insight_id}/save-as-note

Save an insight as a note.

**Path Parameters**:
- `insight_id` (string): Insight ID

**Request Body**:
```json
{
  "notebook_id": "notebook:uuid"
}
```

**Response**:
```json
{
  "note_id": "note:uuid",
  "message": "Insight saved as note successfully"
}
```

## 🎛️ Settings API

Manage application settings and configuration.

### GET /api/settings

Get current application settings.

**Response**:
```json
{
  "default_content_processing_engine_doc": "docling",
  "default_content_processing_engine_url": "firecrawl",
  "default_embedding_option": "auto",
  "auto_delete_files": "false",
  "youtube_preferred_languages": ["en", "es"]
}
```

### PUT /api/settings

Update application settings.

**Request Body** (all fields optional):
```json
{
  "default_content_processing_engine_doc": "docling",
  "default_content_processing_engine_url": "firecrawl",
  "default_embedding_option": "auto",
  "auto_delete_files": "true",
  "youtube_preferred_languages": ["en", "fr", "de"]
}
```

**Response**: Same as GET response

## 💬 Chat API

Manage chat sessions and conversational AI interactions within notebooks.

### GET /api/chat/sessions

Get all chat sessions for a notebook.

**Query Parameters**:
- `notebook_id` (string, required): Notebook ID to get sessions for

**Response**:
```json
[
  {
    "id": "chat_session:uuid",
    "title": "Chat Session Title",
    "notebook_id": "notebook:uuid",
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z",
    "message_count": 5
  }
]
```

**Example**:
```bash
curl -X GET "http://localhost:5055/api/chat/sessions?notebook_id=notebook:uuid"
```

### POST /api/chat/sessions

Create a new chat session for a notebook.

**Request Body**:
```json
{
  "notebook_id": "notebook:uuid",
  "title": "Optional session title"
}
```

**Response**: Same as GET single session

**Example**:
```bash
curl -X POST http://localhost:5055/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"notebook_id": "notebook:uuid", "title": "New Chat Session"}'
```

### GET /api/chat/sessions/{session_id}

Get a specific chat session with its message history.

**Path Parameters**:
- `session_id` (string): Chat session ID

**Response**:
```json
{
  "id": "chat_session:uuid",
  "title": "Chat Session Title",
  "notebook_id": "notebook:uuid",
  "created": "2024-01-01T00:00:00Z",
  "updated": "2024-01-01T00:00:00Z",
  "message_count": 3,
  "messages": [
    {
      "id": "msg_1",
      "type": "human",
      "content": "Hello, what can you tell me about AI?",
      "timestamp": null
    },
    {
      "id": "msg_2", 
      "type": "ai",
      "content": "AI, or Artificial Intelligence, refers to...",
      "timestamp": null
    }
  ]
}
```

### PUT /api/chat/sessions/{session_id}

Update a chat session (currently supports title updates).

**Path Parameters**:
- `session_id` (string): Chat session ID

**Request Body**:
```json
{
  "title": "Updated Session Title"
}
```

**Response**: Same as GET single session (without messages)

### DELETE /api/chat/sessions/{session_id}

Delete a chat session and all its messages.

**Path Parameters**:
- `session_id` (string): Chat session ID

**Response**:
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

### POST /api/chat/execute

Execute a chat message and get AI response.

**Request Body**:
```json
{
  "session_id": "chat_session:uuid",
  "message": "What are the key benefits of machine learning?",
  "context": {
    "sources": [
      {
        "id": "source:uuid",
        "title": "ML Research Paper",
        "content": "Machine learning content..."
      }
    ],
    "notes": [
      {
        "id": "note:uuid",
        "title": "ML Notes",
        "content": "My notes on ML..."
      }
    ]
  }
}
```

**Response**:
```json
{
  "session_id": "chat_session:uuid",
  "messages": [
    {
      "id": "msg_1",
      "type": "human", 
      "content": "What are the key benefits of machine learning?",
      "timestamp": null
    },
    {
      "id": "msg_2",
      "type": "ai",
      "content": "Based on the provided context, machine learning offers several key benefits...",
      "timestamp": null
    }
  ]
}
```

**Example**:
```bash
curl -X POST http://localhost:5055/api/chat/execute \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "chat_session:uuid",
    "message": "Summarize the main points",
    "context": {"sources": [], "notes": []}
  }'
```

### POST /api/chat/context

Build context for chat based on notebook content and configuration.

**Request Body**:
```json
{
  "notebook_id": "notebook:uuid",
  "context_config": {
    "sources": {
      "source:uuid1": "full content",
      "source:uuid2": "insights only"
    },
    "notes": {
      "note:uuid1": "full content"
    }
  }
}
```

**Context Configuration Values**:
- `"full content"`: Include complete source/note content
- `"insights only"`: Include source insights/summary only  
- `"not in context"`: Exclude from context

**Response**:
```json
{
  "context": {
    "sources": [
      {
        "id": "source:uuid",
        "title": "Source Title",
        "content": "Source content or insights...",
        "type": "source"
      }
    ],
    "notes": [
      {
        "id": "note:uuid",
        "title": "Note Title", 
        "content": "Note content...",
        "type": "note"
      }
    ]
  },
  "token_count": 1250,
  "char_count": 5000
}
```

## 📐 Context API

Manage context configuration for AI operations.

### POST /api/context

Get context information for a notebook.

**Request Body**:
```json
{
  "notebook_id": "notebook:uuid",
  "context_config": {
    "sources": {
      "source:uuid1": "full",
      "source:uuid2": "summary"
    },
    "notes": {
      "note:uuid1": "full"
    }
  }
}
```

**Context Levels**:
- `full`: Include complete content
- `summary`: Include summary only
- `exclude`: Exclude from context

**Response**:
```json
{
  "notebook_id": "notebook:uuid",
  "sources": [
    {
      "id": "source:uuid",
      "title": "Source Title",
      "content": "Source content...",
      "inclusion_level": "full"
    }
  ],
  "notes": [
    {
      "id": "note:uuid",
      "title": "Note Title",
      "content": "Note content...",
      "inclusion_level": "full"
    }
  ],
  "total_tokens": 1500
}
```

## 🔨 Commands API

Monitor and manage background jobs.

### GET /api/commands

Get all commands (background jobs).

**Query Parameters**:
- `status` (string, optional): Filter by status
- `limit` (integer, optional): Maximum results

**Response**:
```json
[
  {
    "id": "command:uuid",
    "name": "source_processing",
    "status": "completed",
    "progress": 100,
    "result": {...},
    "error": null,
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z"
  }
]
```

### GET /api/commands/{command_id}

Get a specific command by ID.

**Path Parameters**:
- `command_id` (string): Command ID

**Response**: Same as array item above

### DELETE /api/commands/{command_id}

Cancel/delete a command.

**Path Parameters**:
- `command_id` (string): Command ID

**Response**:
```json
{
  "message": "Command deleted successfully"
}
```

## 🏷️ Embedding API

Manage vector embeddings for content. The embedding system supports both synchronous and asynchronous processing, as well as bulk rebuild operations for upgrading embeddings when switching models.

### POST /api/embed

Generate embeddings for an item (source, note, or insight).

**Request Body**:
```json
{
  "item_id": "source:uuid",
  "item_type": "source",
  "async_processing": false
}
```

**Parameters**:
- `item_id` (string, required): ID of the item to embed
- `item_type` (string, required): Type of item - `source`, `note`, or `insight`
- `async_processing` (boolean, optional): Process in background (default: false)

**Behavior**:
- Embedding operations are **idempotent** - calling multiple times safely replaces existing embeddings
- For sources: Deletes existing chunks and creates new embeddings
- For notes: Updates the note's embedding vector
- For insights: Regenerates the insight's embedding vector

**Response (Synchronous)**:
```json
{
  "success": true,
  "message": "Source embedded successfully",
  "item_id": "source:uuid",
  "item_type": "source"
}
```

**Response (Asynchronous)**:
```json
{
  "success": true,
  "message": "Embedding queued for background processing",
  "item_id": "source:uuid",
  "item_type": "source",
  "command_id": "command:uuid"
}
```

**Example (Synchronous)**:
```bash
curl -X POST http://localhost:5055/api/embed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "item_id": "source:abc123",
    "item_type": "source",
    "async_processing": false
  }'
```

**Example (Asynchronous)**:
```bash
# Submit for background processing
COMMAND_ID=$(curl -X POST http://localhost:5055/api/embed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "item_id": "source:abc123",
    "item_type": "source",
    "async_processing": true
  }' | jq -r '.command_id')

# Check status
curl -X GET http://localhost:5055/api/commands/$COMMAND_ID
```

### POST /api/embeddings/rebuild

Rebuild embeddings for multiple items in bulk. Useful when switching embedding models or fixing corrupted embeddings.

**Request Body**:
```json
{
  "mode": "existing",
  "include_sources": true,
  "include_notes": true,
  "include_insights": true
}
```

**Parameters**:
- `mode` (string, required): Rebuild mode
  - `"existing"`: Re-embed only items that already have embeddings
  - `"all"`: Re-embed existing items + create embeddings for items without any
- `include_sources` (boolean, optional): Include sources in rebuild (default: true)
- `include_notes` (boolean, optional): Include notes in rebuild (default: true)
- `include_insights` (boolean, optional): Include insights in rebuild (default: true)

**Response**:
```json
{
  "command_id": "command:uuid",
  "message": "Rebuild started successfully",
  "estimated_items": 165
}
```

**Example**:
```bash
# Rebuild all existing embeddings
curl -X POST http://localhost:5055/api/embeddings/rebuild \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "mode": "existing",
    "include_sources": true,
    "include_notes": true,
    "include_insights": true
  }'

# Rebuild and create new embeddings for everything
curl -X POST http://localhost:5055/api/embeddings/rebuild \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "mode": "all",
    "include_sources": true,
    "include_notes": false,
    "include_insights": false
  }'
```

### GET /api/embeddings/rebuild/{command_id}/status

Get the status and progress of a rebuild operation.

**Path Parameters**:
- `command_id` (string): Command ID returned from rebuild endpoint

**Response (Running)**:
```json
{
  "command_id": "command:uuid",
  "status": "running",
  "progress": null,
  "stats": null,
  "started_at": "2024-01-01T12:00:00Z",
  "completed_at": null,
  "error_message": null
}
```

**Response (Completed)**:
```json
{
  "command_id": "command:uuid",
  "status": "completed",
  "progress": {
    "total_items": 165,
    "processed_items": 165,
    "failed_items": 0
  },
  "stats": {
    "sources_processed": 115,
    "notes_processed": 25,
    "insights_processed": 25,
    "processing_time": 125.5
  },
  "started_at": "2024-01-01T12:00:00Z",
  "completed_at": "2024-01-01T12:02:05Z",
  "error_message": null
}
```

**Response (Failed)**:
```json
{
  "command_id": "command:uuid",
  "status": "failed",
  "progress": {
    "total_items": 165,
    "processed_items": 50,
    "failed_items": 1
  },
  "stats": null,
  "started_at": "2024-01-01T12:00:00Z",
  "completed_at": "2024-01-01T12:01:00Z",
  "error_message": "No embedding model configured"
}
```

**Example**:
```bash
# Start rebuild
COMMAND_ID=$(curl -X POST http://localhost:5055/api/embeddings/rebuild \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{"mode": "existing", "include_sources": true}' \
  | jq -r '.command_id')

# Poll for status
while true; do
  STATUS=$(curl -s -X GET \
    "http://localhost:5055/api/embeddings/rebuild/$COMMAND_ID/status" \
    -H "Authorization: Bearer YOUR_PASSWORD" \
    | jq -r '.status')

  echo "Status: $STATUS"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi

  sleep 5
done

# Get final results
curl -X GET "http://localhost:5055/api/embeddings/rebuild/$COMMAND_ID/status" \
  -H "Authorization: Bearer YOUR_PASSWORD" | jq .
```

**Status Values**:
- `queued`: Rebuild job queued for processing
- `running`: Rebuild in progress
- `completed`: Rebuild finished successfully
- `failed`: Rebuild failed with error

## 🚨 Error Responses

### Common Error Codes

**400 Bad Request**:
```json
{
  "detail": "Invalid input data"
}
```

**401 Unauthorized**:
```json
{
  "detail": "Authentication required"
}
```

**404 Not Found**:
```json
{
  "detail": "Resource not found"
}
```

**422 Validation Error**:
```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**500 Internal Server Error**:
```json
{
  "detail": "Internal server error occurred"
}
```

## 📋 Usage Examples

### Complete Workflow Example

```bash
# 1. Get the notebook (assuming single notebook exists)
NOTEBOOK_ID=$(curl -X GET http://localhost:5055/api/notebooks \
  | jq -r '.[0].id')

# 2. Add a source
SOURCE_ID=$(curl -X POST http://localhost:5055/api/sources \
  -H "Content-Type: application/json" \
  -d "{\"notebook_id\": \"$NOTEBOOK_ID\", \"type\": \"link\", \"url\": \"https://example.com/ai-article\", \"embed\": true}" \
  | jq -r '.id')

# 3. Create a model
MODEL_ID=$(curl -X POST http://localhost:5055/api/models \
  -H "Content-Type: application/json" \
  -d '{"name": "gpt-5-mini", "provider": "openai", "type": "language"}' \
  | jq -r '.id')

# 4. Create a note
```

### Chat Conversation Example

```bash
# 1. Create a chat session
SESSION_ID=$(curl -X POST http://localhost:5055/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d "{\"notebook_id\": \"$NOTEBOOK_ID\", \"title\": \"Research Discussion\"}" \
  | jq -r '.id')

# 2. Build context for the chat
CONTEXT=$(curl -X POST http://localhost:5055/api/chat/context \
  -H "Content-Type: application/json" \
  -d "{\"notebook_id\": \"$NOTEBOOK_ID\", \"context_config\": {\"sources\": {\"$SOURCE_ID\": \"full content\"}}}")

# 3. Send a chat message
curl -X POST http://localhost:5055/api/chat/execute \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\", \"message\": \"What are the key insights from this research?\", \"context\": $CONTEXT}"

# 4. Get chat history
curl -X GET http://localhost:5055/api/chat/sessions/$SESSION_ID

# 5. List all sessions for the notebook
curl -X GET "http://localhost:5055/api/chat/sessions?notebook_id=$NOTEBOOK_ID"
```

## 📡 WebSocket Support

Currently, Open Notebook uses Server-Sent Events (SSE) for real-time updates. WebSocket support may be added in future versions for more interactive features.

## 📈 Rate Limiting

The API currently doesn't enforce rate limiting, but it's recommended to implement rate limiting in production deployments to prevent abuse.

## 🔄 Versioning

The API uses semantic versioning. Breaking changes will increment the major version number. The current API version is included in the OpenAPI documentation at `/docs`.

---

This API reference provides comprehensive coverage of Open Notebook's REST API. For additional examples and integration patterns, check the [GitHub repository](https://github.com/lfnovo/open-notebook) and join our [Discord community](https://discord.gg/37XJPXfz2w).