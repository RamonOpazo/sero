from typing import Iterator
from pathlib import Path
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session

from sero.models import Base


def get_db_engine(dbfile: Path) -> Engine:
    return create_engine(f"duckdb:///{dbfile}")


def get_db_session(dbfile: Path) -> Iterator[Session]:
    engine = get_db_engine(dbfile)
    _Session = sessionmaker(bind=engine)
    with _Session() as session:
        yield session


def init_db(dbfile: Path):
    engine = get_db_engine(dbfile)
    Base.metadata.create_all(engine)
