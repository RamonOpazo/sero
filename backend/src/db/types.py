import uuid
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import TypeDecorator, LargeBinary, Text, DateTime
from sqlalchemy.engine import Dialect


class UUIDBytes(TypeDecorator):
    impl = LargeBinary
    cache_ok = True
    
    def load_dialect_impl(self, dialect: Dialect) -> Any:
        # Use BLOB type for SQLite, LargeBinary for others
        if dialect.name == 'sqlite':
            return dialect.type_descriptor(LargeBinary(16))
        return dialect.type_descriptor(LargeBinary(16))
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> bytes | None:
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value.bytes
        if isinstance(value, str):
            return uuid.UUID(value).bytes
        if isinstance(value, bytes):
            # Assume it's already in the correct format
            return value
        raise ValueError(f"Cannot convert {type(value)} to UUID bytes")
    
    def process_result_value(self, value: bytes | None, dialect: Dialect) -> uuid.UUID | None:
        if value is None:
            return None
        if isinstance(value, bytes):
            return uuid.UUID(bytes=value)
        raise ValueError(f"Expected bytes, got {type(value)}")
    
    def compare_values(self, x: Any, y: Any) -> bool:
        if x is None and y is None:
            return True
        if x is None or y is None:
            return False
        
        # Convert both to UUID objects for comparison
        try:
            if isinstance(x, bytes):
                x = uuid.UUID(bytes=x)
            elif isinstance(x, str):
                x = uuid.UUID(x)
            
            if isinstance(y, bytes):
                y = uuid.UUID(bytes=y)
            elif isinstance(y, str):
                y = uuid.UUID(y)
            
            return x == y
        except (ValueError, TypeError):
            return False

    @classmethod
    def generate_uuid(cls) -> uuid.UUID:
        return uuid.uuid4()


class JSONList(TypeDecorator):
    impl = Text
    cache_ok = True
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> str | None:
        if value is None:
            return None
        if isinstance(value, list):
            return json.dumps(value)
        raise ValueError(f"Expected list, got {type(value)}")
    
    def process_result_value(self, value: str | None, dialect: Dialect) -> list | None:
        if value is None:
            return None
        if isinstance(value, str):
            return json.loads(value)
        raise ValueError(f"Expected string, got {type(value)}")


class AwareDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True
    
    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        
        if isinstance(value, datetime):
            if value.tzinfo is None:
                # Assume naive datetimes are in UTC
                value = value.replace(tzinfo=timezone.utc)
            else:
                # Convert to UTC
                value = value.astimezone(timezone.utc)
            # Return as naive UTC datetime for storage
            return value.replace(tzinfo=None)
        
        raise ValueError(f"Expected datetime, got {type(value)}")
    
    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        
        if isinstance(value, datetime):
            # Assume stored datetime is in UTC and make it timezone-aware
            return value.replace(tzinfo=timezone.utc)
        
        raise ValueError(f"Expected datetime, got {type(value)}")
