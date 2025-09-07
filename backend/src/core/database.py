from contextlib import contextmanager
from typing import Generator
from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from src.core.config import settings
from src.db.models import Base


class _DatabaseManager:
    def __init__(self):
        self._engine = None
        self._SessionLocal = None

    def get_url(self) -> str:
        return f"sqlite:///{settings.db.filepath.absolute()}"

    def init(self):
        if self._engine is not None:
            logger.info("Database already initialized")
            return

        db_url = self.get_url()
        logger.info(f"Initializing SQLite database: {db_url}")

        # Ensure the database directory exists
        settings.db.filepath.parent.mkdir(parents=True, exist_ok=True)

        self._engine = create_engine(
            db_url,
            echo=settings.is_debug_mode,
            # SQLite specific pool settings
            pool_pre_ping=True,
            pool_recycle=3600,
            connect_args={
                "check_same_thread": False,  # Allow sharing connections between threads
                "timeout": 30,  # Connection timeout in seconds
            }
        )
        
        # Configure SQLite pragmas for optimal performance
        from sqlalchemy import event
        
        @event.listens_for(self._engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            # Enable WAL mode for better concurrency
            cursor.execute(f"PRAGMA journal_mode={settings.db.journal_mode}")
            # Set synchronous mode
            cursor.execute(f"PRAGMA synchronous={settings.db.synchronous}")
            # Set cache size (negative value means KB)
            cursor.execute(f"PRAGMA cache_size={settings.db.cache_size}")
            # Store temporary tables in memory
            cursor.execute(f"PRAGMA temp_store={settings.db.temp_store}")
            # Enable foreign key constraints
            cursor.execute("PRAGMA foreign_keys=ON")
            # Optimize for better performance
            cursor.execute("PRAGMA optimize")
            cursor.close()
        
        self._SessionLocal = sessionmaker(bind=self._engine, autocommit=False, autoflush=False)
        Base.metadata.create_all(bind=self._engine)
        logger.info("SQLite database tables created successfully")

    def get_session(self) -> Session:
        if self._SessionLocal is None:
            raise RuntimeError("Database not initialized: call 'self.init()' first.")
        return self._SessionLocal()

    def close(self):
        if self._engine:
            self._engine.dispose()
            logger.info("SQLite database connections closed")

    def execute_raw(self, sql: str, params: dict | None = None):
        with self.session_scope() as db:
            result = db.execute(sql, params or {})
            return result.fetchall()

    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception as err:
            logger.error(f"Database transaction error: {err}")
            session.rollback()
            raise err
        finally:
            session.close()


# Singleton instance
db_manager = _DatabaseManager()


# FastAPI dependency injection support
def get_db_session() -> Generator[Session, None, None]:
    db = db_manager.get_session()
    try:
        yield db
    except Exception as err:
        logger.error(f"Database session error: {err}")
        db.rollback()
        raise err
    finally:
        db.close()
