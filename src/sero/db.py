from typing import Iterator
from pathlib import Path
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session

from sero.models import Base


def get_db_engine(db_path: Path) -> Engine:
    """Creates and returns a SQLAlchemy database engine for a DuckDB database.

    Args:
        db_path (Path): The file path to the DuckDB database.

    Returns:
        Engine: A SQLAlchemy engine connected to the specified DuckDB database.

    Example:
        >>> from pathlib import Path
        >>> engine = get_db_engine(Path("example.duckdb"))
    """
    return create_engine(f"duckdb:///{db_path}")


def get_db_session(db_path: Path) -> Iterator[Session]:
    """Creates and yields a SQLAlchemy session for a DuckDB database.

    This function initializes the database (if necessary), creates a session factory,
    and yields a session within a context manager.

    Args:
        db_path (Path): The file path to the DuckDB database.

    Yields:
        Session: A SQLAlchemy session connected to the specified DuckDB database.

    Example:
        >>> from pathlib import Path
        >>> session = next(get_db_session(Path("example.duckdb")))
        >>> session.execute("SELECT 1")
    """
    engine = get_db_engine(db_path)
    init_db(engine)
    _Session = sessionmaker(bind=engine)
    with _Session() as session:
        yield session


def init_db(engine: Engine):
    """Initializes the database by creating all defined tables.

    This function ensures that all SQLAlchemy ORM models mapped to `Base`
    are created in the given database engine.

    Args:
        engine (Engine): A SQLAlchemy engine connected to the database.

    Example:
        >>> from sqlalchemy import create_engine
        >>> engine = create_engine("duckdb:///example.duckdb")
        >>> init_db(engine)
    """
    Base.metadata.create_all(engine)
