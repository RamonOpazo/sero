from uuid import UUID
from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from sero.db import get_db_session
from sero.models import Manifest, Unit, Document
from sero.schemas import ManifestCreate


def save_manifest(dbfile: Path, **data: ManifestCreate) -> None:
    session = next(get_db_session(dbfile))
    res = session.execute(select(Manifest))
    mainfest = res.scalar()
    new_mainfest = mainfest or Manifest()
    
    for key, value in data.items():
        if value:
            setattr(new_mainfest, key, value)
    
    if mainfest is None:
        session.add(new_mainfest)

    session.commit()


def save_unit(dbfile: Path, unit_id: UUID, file_name: str, cropped_text: bytes) -> None:
    session = next(get_db_session(dbfile))
    unit = Unit(id=unit_id, file_name=file_name, cropped_text=cropped_text)
    session.add(unit)
    session.commit()


def save_document(dbfile: Path, unit_id: UUID, data: bytes) -> None:
    session = next(get_db_session(dbfile))
    doc = Document(unit_id=unit_id, data=data)
    session.add(doc)
    session.commit()


def retrieve_units(dbfile: Path, unit_id: UUID | None = None) -> list[Unit]:
    session = next(get_db_session(dbfile))
    stmt = (
        select(Unit)
        .options(joinedload(Unit.document))
    )
    
    if unit_id:
        stmt = stmt.where(Unit.id == unit_id)
    
    res = session.execute(stmt)
    units = res.scalars().all()
    return units


def count_units(dbfile: Path) -> int:
    session = next(get_db_session(dbfile))
    res = session.execute(select(func.count()).select_from(Unit))
    total_units = res.scalar_one()
    return total_units


def retrieve_manifest(dbfile: Path) -> Manifest | None:
    session = next(get_db_session(dbfile))
    res = session.execute(select(Manifest))
    meta = res.scalar()
    return meta


# r"Núm. H.C.: (?P<hc>\d+)|CIP: (?P<cip>[A-Z0-9]+)|D. Naixement \(Edat\): (?P<birth_date>\d+/\d+/\d+)|Sexe: (?P<sex>\w+)|Data Obtenció: (?P<proc_date>\d+/\d+/\d+)|Núm\. Estudi:\s+(?P<num_corr>[A-Z0-9]+)"
