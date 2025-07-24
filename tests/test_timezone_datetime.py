"""Test timezone-aware datetime handling with SQLite."""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.db.models import Base, Project
from backend.db.types import TimezoneAwareDateTime


def test_timezone_aware_datetime_type():
    """Test that TimezoneAwareDateTime correctly handles timezone conversion."""
    from backend.db.types import TimezoneAwareDateTime
    from sqlalchemy.engine import create_engine
    
    # Create an in-memory SQLite database for testing
    engine = create_engine("sqlite:///:memory:")
    
    tz_type = TimezoneAwareDateTime()
    
    # Test timezone-aware datetime (should be converted to naive UTC for storage)
    eastern = timezone(timedelta(hours=-5))  # EST
    aware_dt = datetime(2023, 1, 1, 12, 0, 0, tzinfo=eastern)
    
    # Process for storage (should convert to naive UTC)
    stored_value = tz_type.process_bind_param(aware_dt, engine.dialect)
    assert stored_value.tzinfo is None  # Should be naive
    assert stored_value == datetime(2023, 1, 1, 17, 0, 0)  # Converted to UTC
    
    # Process for retrieval (should convert back to timezone-aware UTC)
    retrieved_value = tz_type.process_result_value(stored_value, engine.dialect)
    assert retrieved_value.tzinfo == timezone.utc
    assert retrieved_value == datetime(2023, 1, 1, 17, 0, 0, tzinfo=timezone.utc)


def test_timezone_naive_datetime_handling():
    """Test that naive datetimes are assumed to be UTC."""
    from backend.db.types import TimezoneAwareDateTime
    from sqlalchemy.engine import create_engine
    
    engine = create_engine("sqlite:///:memory:")
    tz_type = TimezoneAwareDateTime()
    
    # Test naive datetime (should be assumed to be UTC)
    naive_dt = datetime(2023, 1, 1, 12, 0, 0)
    
    # Process for storage (should remain the same but naive)
    stored_value = tz_type.process_bind_param(naive_dt, engine.dialect)
    assert stored_value.tzinfo is None
    assert stored_value == datetime(2023, 1, 1, 12, 0, 0)
    
    # Process for retrieval (should become timezone-aware UTC)
    retrieved_value = tz_type.process_result_value(stored_value, engine.dialect)
    assert retrieved_value.tzinfo == timezone.utc
    assert retrieved_value == datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


def test_project_model_timezone_handling():
    """Test that Project model handles timezones correctly."""
    # Create an in-memory SQLite database for testing
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Create a project with timezone-aware datetime
        utc_now = datetime.now(timezone.utc)
        project = Project(
            name="Test Project",
            description="Test description", 
            version=1,
            contact_name="Test User",
            contact_email="test@example.com",
            password_hash=b"test_hash",
            created_at=utc_now
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Verify the datetime is timezone-aware
        assert project.created_at.tzinfo == timezone.utc
        
        # Query the project back from the database
        retrieved_project = db.query(Project).filter(Project.name == "Test Project").first()
        assert retrieved_project is not None
        assert retrieved_project.created_at.tzinfo == timezone.utc
        
        # The datetime should be close to what we set (within a few seconds)
        time_diff = abs((retrieved_project.created_at - utc_now).total_seconds())
        assert time_diff < 2  # Should be very close
        
    finally:
        db.close()


def test_pydantic_schema_timezone_validation():
    """Test that Pydantic schemas work correctly with timezone-aware datetimes."""
    from backend.api.schemas.projects_schema import Project as ProjectSchema
    from backend.core.security import security_manager
    from unittest.mock import patch
    
    # Create a project with timezone-aware datetime
    utc_now = datetime.now(timezone.utc)
    project_data = {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "created_at": utc_now,
        "updated_at": None,
        "name": "Test Project",
        "description": "Test description",
        "version": 1,
        "contact_name": "Test User", 
        "contact_email": "test@example.com",
        "password_hash": "test_hash",
        "documents": []
    }
    
    # This should not raise a validation error
    project_schema = ProjectSchema.model_validate(project_data)
    assert project_schema.created_at.tzinfo == timezone.utc
