from uuid import UUID
from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from sero.db import get_db_session
from sero.models import Metadata, Unit, Document


# Save metadata
def save_metadata(db_path: Path, description: str | None, regex: str | None) -> None:
    session = next(get_db_session(db_path=db_path))
    res = session.execute(select(Metadata))
    meta = res.scalar()
    new_meta = meta or Metadata()
    
    for key, value in {"description": description, "regex": regex}.items():
        if value:
            setattr(new_meta, key, value)
    
    if meta is None:
        session.add(new_meta)

    session.commit()


# Save extracted text
def save_unit(db_path: Path, unit_id: UUID, file_name: str, cropped_text: str) -> None:
    session = next(get_db_session(db_path=db_path))
    unit = Unit(id=unit_id, file_name=file_name, cropped_text=cropped_text)
    session.add(unit)
    session.commit()


# Save PDF document (linked to a unit)
def save_document(db_path, unit_id, data) -> None:
    session = next(get_db_session(db_path=db_path))
    doc = Document(unit_id=unit_id, data=data)
    session.add(doc)
    session.commit()


def retrieve_units(db_path: Path, unit_id: UUID | None = None) -> list[Unit]:
    session = next(get_db_session(db_path=db_path))
    stmt = (
        select(Unit)
        .options(joinedload(Unit.document))
    )
    
    if unit_id:
        stmt = stmt.where(Unit.id == unit_id)
    
    res = session.execute(stmt)
    units = res.scalars().all()
    return units


def count_units(db_path: Path) -> int:
    session = next(get_db_session(db_path=db_path))
    res = session.execute(select(func.count()).select_from(Unit))
    total_units = res.scalar_one()
    return total_units


def retrieve_metadata(db_path: Path) -> Metadata | None:
    session = next(get_db_session(db_path=db_path))
    res = session.execute(select(Metadata))
    meta = res.scalar()
    return meta


# r"Núm. H.C.: (?P<hc>\d+)|CIP: (?P<cip>[A-Z0-9]+)|D. Naixement \(Edat\): (?P<birth_date>\d+/\d+/\d+)|Sexe: (?P<sex>\w+)|Data Obtenció: (?P<proc_date>\d+/\d+/\d+)|Núm\. Estudi:\s+(?P<num_corr>[A-Z0-9]+)"