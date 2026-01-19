from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client after environment variables have been cleared by conftest."""
    from api.main import app
    return TestClient(app)


class TestModelCreation:
    """Test suite for Model Creation endpoint."""

    @pytest.mark.asyncio
    @patch("open_notebook.database.repository.repo_query")
    @patch("api.routers.models.Model.save")
    async def test_create_duplicate_model_same_case(self, mock_save, mock_repo_query, client):
        """Test that creating a duplicate model with same case returns 400."""
        # Mock repo_query to return a duplicate model
        mock_repo_query.return_value = [{"id": "model:123", "name": "gpt-4", "provider": "openai", "type": "language"}]

        # Attempt to create duplicate
        response = client.post(
            "/api/models",
            json={
                "name": "gpt-4",
                "provider": "openai",
                "type": "language"
            }
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Model 'gpt-4' already exists for provider 'openai'"

    @pytest.mark.asyncio
    @patch("open_notebook.database.repository.repo_query")
    @patch("api.routers.models.Model.save")
    async def test_create_duplicate_model_different_case(self, mock_save, mock_repo_query, client):
        """Test that creating a duplicate model with different case returns 400."""
        # Mock repo_query to return a duplicate model (case-insensitive match)
        mock_repo_query.return_value = [{"id": "model:123", "name": "gpt-4", "provider": "openai", "type": "language"}]

        # Attempt to create duplicate with different case
        response = client.post(
            "/api/models",
            json={
                "name": "GPT-4",
                "provider": "OpenAI",
                "type": "language"
            }
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Model 'GPT-4' already exists for provider 'OpenAI'"

    @pytest.mark.asyncio
    @patch("open_notebook.database.repository.repo_query")
    async def test_create_same_model_name_different_provider(self, mock_repo_query, client):
        """Test that creating a model with same name but different provider is allowed."""
        from open_notebook.domain.models import Model

        # Mock repo_query to return empty (no duplicate found for different provider)
        mock_repo_query.return_value = []

        # Patch the save method on the Model class
        with patch.object(Model, 'save', new_callable=AsyncMock) as mock_save:
            # Attempt to create same model name with different provider (google)
            response = client.post(
                "/api/models",
                json={
                    "name": "gpt-4",
                    "provider": "google",
                    "type": "language"
                }
            )

            # Should succeed because provider is different
            assert response.status_code == 200


class TestModelsProviderAvailability:
    """Test suite for Models Provider Availability endpoint."""

    @patch("api.routers.models.os.environ.get")
    @patch("api.routers.models.AIFactory.get_available_providers")
    def test_ollama_provider_availability(self, mock_esperanto, mock_env, client):
        """Test that OLLAMA_API_BASE enables ollama provider."""

        def env_side_effect(key):
            if key == "OLLAMA_API_BASE":
                return "http://localhost:11434"
            return None

        mock_env.side_effect = env_side_effect

        mock_esperanto.return_value = {
            "language": ["ollama"],
            "embedding": ["ollama"],
        }

        response = client.get("/api/models/providers")

        assert response.status_code == 200
        data = response.json()

        assert "ollama" in data["available"]
        assert "ollama" in data["supported_types"]
        supported = data["supported_types"]["ollama"]
        assert "language" in supported
        assert "embedding" in supported

    @patch("api.routers.models.os.environ.get")
    @patch("api.routers.models.AIFactory.get_available_providers")
    def test_openai_provider_availability(self, mock_esperanto, mock_env, client):
        """Test that OPENAI_API_KEY enables openai provider."""

        def env_side_effect(key):
            if key == "OPENAI_API_KEY":
                return "sk-test-key"
            return None

        mock_env.side_effect = env_side_effect

        mock_esperanto.return_value = {
            "language": ["openai"],
            "embedding": ["openai"],
        }

        response = client.get("/api/models/providers")

        assert response.status_code == 200
        data = response.json()

        assert "openai" in data["available"]
        assert "openai" in data["supported_types"]

    @patch("api.routers.models.os.environ.get")
    @patch("api.routers.models.AIFactory.get_available_providers")
    def test_google_provider_availability(self, mock_esperanto, mock_env, client):
        """Test that GOOGLE_API_KEY or GEMINI_API_KEY enables google provider."""

        def env_side_effect(key):
            if key == "GOOGLE_API_KEY":
                return "test-key"
            return None

        mock_env.side_effect = env_side_effect

        mock_esperanto.return_value = {
            "language": ["google"],
            "embedding": ["google"],
        }

        response = client.get("/api/models/providers")

        assert response.status_code == 200
        data = response.json()

        assert "google" in data["available"]
        assert "google" in data["supported_types"]

