from contextlib import contextmanager
from typing import Generator
from loguru import logger
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from backend.core.config import settings
from backend.db.models import Base


class _DatabaseManager:
    def __init__(self):
        self._engine = None
        self._SessionLocal = None

    def get_url(self) -> str:
        return f"duckdb:///{settings.db.filepath.absolute()}"

    def init(self):
        if self._engine is not None:
            logger.info("Database already initialized")
            return

        db_url = self.get_url()
        logger.info(f"Initializing DuckDB database: {db_url}")

        self._engine = create_engine(
            db_url,
            echo=settings.is_debug_mode,
            poolclass=None,
            connect_args={
                "config": {
                    "memory_limit": settings.db.memory_limit,
                    "threads": settings.db.threads,
                }
            }
        )
        self._SessionLocal = sessionmaker(bind=self._engine, autocommit=False, autoflush=False)
        Base.metadata.create_all(bind=self._engine)
        logger.info("DuckDB database tables created successfully")

    def get_session(self) -> Session:
        if self._SessionLocal is None:
            raise RuntimeError("Database not initialized. Call `init()` first.")
        return self._SessionLocal()

    def close(self):
        if self._engine:
            self._engine.dispose()
            logger.info("DuckDB database connections closed")

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
        except Exception as e:
            logger.error(f"Database transaction error: {e}")
            session.rollback()
            raise
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
