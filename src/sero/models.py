import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, UUID, Text, DateTime, ForeignKey, BLOB, BINARY
from sqlalchemy.orm import declarative_base, relationship


Base = declarative_base()


class Manifest(Base):
    __tablename__ = "meta"
    id = Column(UUID, primary_key=True, default=lambda: uuid.uuid4())
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    sero_version = Column(Text, nullable=False)
    sec_hash = Column(BINARY, nullable=True)

    @property
    def is_secured(self) -> bool:
        return self.sec_hash is not None


class Unit(Base):
    __tablename__ = "units"
    id = Column(UUID, primary_key=True, default=lambda: uuid.uuid4())
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    file_name = Column(Text, nullable=False)
    cropped_text = Column(BINARY, nullable=True)

    document = relationship("Document", uselist=False, back_populates="unit")

    # @hybrid_property
    # def structured_data(self) -> dict[str, str] | None:
    #     session = Session.object_session(self)
        
    #     if session is None:
    #         return None
        
    #     res = session.execute(select(Metadata.regex))
    #     regex = res.scalar()
        
    #     if regex is None:
    #         return None
        
    #     matches = re.finditer(pattern=regex, string=self.cropped_text)
    #     return { k: v for match in matches for k, v in match.groupdict().items() if v }

    @property
    def document_size_in_bytes(self) -> int:
        return self.document.size
    
    @property
    def document_size_in_kbytes(self) -> int:
        return self.document_size_in_bytes / 1024
    
    @property
    def document_size_in_mbytes(self) -> int:
        return self.document_size_in_kbytes / 1024
    
    @property
    def document_size(self) -> str:
        diff_bytes = abs(self.document_size_in_bytes - 1)
        diff_kb = abs(self.document_size_in_kbytes - 1)
        diff_mb = abs(self.document_size_in_mbytes - 1)
        min_diff = min(diff_bytes, diff_kb, diff_mb)
        
        if min_diff == diff_bytes:
            return f"{self.document_size_in_bytes:.2f} bytes"
        
        if min_diff == diff_kb:
            return f"{self.document_size_in_kbytes:.2f} KB"
        
        if min_diff == diff_mb:
            return f"{self.document_size_in_mbytes:.2f} MB"


class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID, primary_key=True, default=lambda: uuid.uuid4())
    unit_id = Column(UUID, ForeignKey("units.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    data = Column(BLOB, nullable=False)

    unit = relationship("Unit", back_populates="document")
    
    @property
    def size(self) -> int:
        return ((len(self.data) / 4) * 3) if self.data else 0
