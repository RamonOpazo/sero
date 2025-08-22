import uuid
from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Text, BLOB, String, Integer, Float, Enum, Boolean
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship

from backend.db.types import UUIDBytes, JSONList, AwareDateTime
from backend.api.enums import FileType


Base = declarative_base()


class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4())
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    contact_name: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[bytes] = mapped_column(BLOB, nullable=False)

    documents: Mapped[list["Document"]] = relationship("Document", back_populates="project", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)
    name: Mapped[str] = mapped_column(String(100), nullable=False,)
    description: Mapped[str] = mapped_column(Text, nullable=True,)
    tags: Mapped[list[str]] = mapped_column(JSONList, nullable=False, default=[],)

    project_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("projects.id"), nullable=False,)

    project: Mapped["Project"] = relationship("Project", back_populates="documents",)
    files: Mapped[list["File"]] = relationship("File", back_populates="document", cascade="all, delete-orphan",)
    prompts: Mapped[list["Prompt"]] = relationship("Prompt", back_populates="document",)
    selections: Mapped[list["Selection"]] = relationship("Selection", back_populates="document",)
    ai_settings: Mapped["AiSettings | None"] = relationship(
        "AiSettings", back_populates="document", uselist=False, cascade="all, delete-orphan",
    )
    
    @property
    def original_file(self) -> "File | None":
        return next((f for f in self.files if f.file_type == FileType.ORIGINAL), None)
    
    @property
    def redacted_file(self) -> "File | None":
        return next((f for f in self.files if f.file_type == FileType.REDACTED), None)
    

class File(Base):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4())
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256
    file_type: Mapped[FileType] = mapped_column(Enum(FileType), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    data: Mapped[bytes] = mapped_column(BLOB, nullable=False)
    salt: Mapped[bytes] = mapped_column(BLOB, nullable=True)

    document_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("documents.id"), nullable=False)
    
    document: Mapped["Document"] = relationship("Document", back_populates="files")

    @property
    def file_size(self) -> int:
        return int((len(self.data) / 4) * 3) if self.data else 0
    

class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)

    title: Mapped[str] = mapped_column(String(150), nullable=False,)
    prompt: Mapped[str] = mapped_column(Text, nullable=False,)
    directive: Mapped[str] = mapped_column(String(50), nullable=False,)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True,)

    document_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("documents.id"), nullable=False,)
    
    document: Mapped["Document"] = relationship("Document", back_populates="prompts",)


class AiSettings(Base):
    __tablename__ = "ai_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)

    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="ollama",)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False, default="llama2",)
    temperature: Mapped[float] = mapped_column(Float, nullable=False, default=0.2,)
    top_p: Mapped[float | None] = mapped_column(Float, nullable=True,)
    max_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True,)
    num_ctx: Mapped[int | None] = mapped_column(Integer, nullable=True,)
    seed: Mapped[int | None] = mapped_column(Integer, nullable=True,)
    stop_tokens: Mapped[list[str]] = mapped_column(JSONList, nullable=False, default=[],)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True,)

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUIDBytes, ForeignKey("documents.id"), nullable=False, unique=True,
    )

    document: Mapped["Document"] = relationship("Document", back_populates="ai_settings",)


class Selection(Base):
    __tablename__ = "selections"
    
    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)
    page_number: Mapped[int] = mapped_column(Integer, nullable=True)  # null for all pages
    x: Mapped[float] = mapped_column(Float, nullable=False)  # X coordinate (0-1 normalized)
    y: Mapped[float] = mapped_column(Float, nullable=False)  # Y coordinate (0-1 normalized)
    width: Mapped[float] = mapped_column(Float, nullable=False)  # Width (0-1 normalized)
    height: Mapped[float] = mapped_column(Float, nullable=False)  # Height (0-1 normalized)
    confidence: Mapped[float] = mapped_column(Float, nullable=True)  # AI confidence score (Null if user generated)
    committed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    document_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("documents.id"), nullable=False,)
    
    document: Mapped["Document"] = relationship("Document", back_populates="selections",)

    @property
    def is_ai_generated(self) -> bool:
        return self.confidence is not None
