from typing import Iterator
from pathlib import Path
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session

from sero.models import Base


# Create the DuckDB engine
def get_db_engine(db_path: Path) -> Engine:
    return create_engine(f"duckdb:///{db_path}")


# Create the database session
def get_db_session(db_path: Path) -> Iterator[Session]:
    engine = get_db_engine(db_path)
    init_db(engine)
    _Session = sessionmaker(bind=engine)
    with _Session() as session:
        yield session


# Initialize the database
def init_db(engine: Engine):
    Base.metadata.create_all(engine)
