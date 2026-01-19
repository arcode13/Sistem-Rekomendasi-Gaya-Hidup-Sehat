"""
Unit tests for the open_notebook.domain module.

This test suite focuses on validation logic, business rules, and data structures
that can be tested without database mocking.
"""

import pytest
from pydantic import ValidationError

from open_notebook.domain.base import RecordModel
from open_notebook.domain.content_settings import ContentSettings
from open_notebook.domain.models import ModelManager
from open_notebook.domain.notebook import Notebook, Source
from open_notebook.exceptions import InvalidInputError

# ============================================================================
# TEST SUITE 1: RecordModel Singleton Pattern
# ============================================================================


class TestRecordModelSingleton:
    """Test suite for RecordModel singleton behavior."""

    def test_recordmodel_singleton_behavior(self):
        """Test that same instance is returned for same record_id."""

        class TestRecord(RecordModel):
            record_id = "test:singleton"
            value: int = 0

        # Clear any existing instance
        TestRecord.clear_instance()

        # Create first instance
        instance1 = TestRecord(value=42)
        assert instance1.value == 42

        # Create second instance - should return same object
        instance2 = TestRecord(value=99)
        assert instance1 is instance2
        assert instance2.value == 99  # Value was updated

        # Cleanup
        TestRecord.clear_instance()


# ============================================================================
# TEST SUITE 2: ModelManager Instance Isolation
# ============================================================================


class TestModelManager:
    """Test suite for ModelManager instance behavior."""

    def test_model_manager_instance_isolation(self):
        """Test that each ModelManager instance is independent (not a singleton)."""
        manager1 = ModelManager()
        manager2 = ModelManager()

        # Each instance should be independent (not a singleton)
        assert manager1 is not manager2
        assert id(manager1) != id(manager2)


# ============================================================================
# TEST SUITE 3: Notebook Domain Logic
# ============================================================================


class TestNotebookDomain:
    """Test suite for Notebook validation and business rules."""

    def test_notebook_name_validation(self):
        """Test empty/whitespace names are rejected."""
        # Empty name should raise error
        with pytest.raises(InvalidInputError, match="Notebook name cannot be empty"):
            Notebook(name="", description="Test")

        # Whitespace-only name should raise error
        with pytest.raises(InvalidInputError, match="Notebook name cannot be empty"):
            Notebook(name="   ", description="Test")

        # Valid name should work
        notebook = Notebook(name="Valid Name", description="Test")
        assert notebook.name == "Valid Name"

# ============================================================================
# TEST SUITE 4: Source Domain
# ============================================================================


class TestSourceDomain:
    """Test suite for Source domain model."""

    def test_source_command_field_parsing(self):
        """Test RecordID parsing for command field."""
        # Test with string command
        source = Source(title="Test", command="command:123")
        assert source.command is not None

        # Test with None command
        source2 = Source(title="Test", command=None)
        assert source2.command is None

        # Test command is included in save data prep
        source3 = Source(id="source:123", title="Test", command="command:456")
        save_data = source3._prepare_save_data()
        assert "command" in save_data


# ============================================================================
# TEST SUITE 6: Content Settings
# ============================================================================


class TestContentSettings:
    """Test suite for ContentSettings defaults."""

    def test_content_settings_defaults(self):
        """Test ContentSettings has proper defaults."""
        settings = ContentSettings()

        assert settings.record_id == "open_notebook:content_settings"
        assert settings.default_content_processing_engine_doc == "auto"
        assert settings.default_embedding_option == "ask"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
