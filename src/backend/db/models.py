import uuid
from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Text, BLOB, String, Integer, Float, Enum, UniqueConstraint, case, literal
from sqlalchemy.orm import Mapped, declarative_base, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property

from backend.db.types import UUIDBytes, JSONList, AwareDateTime
from backend.api.enums import FileType, ScopeType, CommitState, AnchorOption


Base = declarative_base()


class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4())
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    contact_name: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[bytes] = mapped_column(BLOB, nullable=False)

    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="project", cascade="all, delete-orphan"
    )
    ai_settings: Mapped["AiSettings"] = relationship(
        "AiSettings", back_populates="project", uselist=False, cascade="all, delete-orphan",
    )
    watermark_settings: Mapped["WatermarkSettings"] = relationship(
        "WatermarkSettings", back_populates="project", uselist=False, cascade="all, delete-orphan",
    )
    annotation_settings: Mapped["AnnotationSettings"] = relationship(
        "AnnotationSettings", back_populates="project", uselist=False, cascade="all, delete-orphan",
    )
    template: Mapped["Template | None"] = relationship(
        "Template", back_populates="project", uselist=False, cascade="all, delete-orphan",
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)
    name: Mapped[str] = mapped_column(String(100), nullable=False,)
    description: Mapped[str] = mapped_column(Text, nullable=True,)

    project_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("projects.id"), nullable=False,)

    project: Mapped["Project"] = relationship("Project", back_populates="documents",)
    files: Mapped[list["File"]] = relationship("File", back_populates="document", cascade="all, delete-orphan",)
    prompts: Mapped[list["Prompt"]] = relationship("Prompt", back_populates="document",)
    selections: Mapped[list["Selection"]] = relationship("Selection", back_populates="document",)
    
    template: Mapped["Template | None"] = relationship(
        "Template", back_populates="document", uselist=False, cascade="all, delete-orphan",
    )

    @property
    def original_file(self) -> "File | None":
        return next((f for f in self.files if f.file_type == FileType.ORIGINAL), None)
    
    @property
    def redacted_file(self) -> "File | None":
        return next((f for f in self.files if f.file_type == FileType.REDACTED), None)
    

class File(Base):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False,)  # SHA-256
    file_type: Mapped[FileType] = mapped_column(Enum(FileType), nullable=False, default=FileType.ORIGINAL,)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False,)
    data: Mapped[bytes] = mapped_column(BLOB, nullable=False,)
    salt: Mapped[bytes] = mapped_column(BLOB, nullable=True,)

    document_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("documents.id"), nullable=False,)
    
    document: Mapped["Document"] = relationship("Document", back_populates="files",)

    @property
    def file_size(self) -> int:
        return int((len(self.data) / 4) * 3) if self.data else 0
    

class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)

    scope: Mapped[ScopeType] = mapped_column(Enum(ScopeType), nullable=False, default=ScopeType.DOCUMENT,)
    state: Mapped[CommitState] = mapped_column(Enum(CommitState), nullable=False, default=CommitState.STAGED_CREATION,)
    title: Mapped[str] = mapped_column(String(150), nullable=False,)
    prompt: Mapped[str] = mapped_column(Text, nullable=False,)
    directive: Mapped[str] = mapped_column(String(50), nullable=False,)

    document_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("documents.id"), nullable=False,)
    
    document: Mapped["Document"] = relationship("Document", back_populates="prompts",)

    @hybrid_property
    def is_staged(self) -> bool:
        return self.state in {CommitState.STAGED_CREATION, CommitState.STAGED_EDITION, CommitState.STAGED_DELETION}

    @is_staged.expression
    def is_staged(cls):
        return case(
            (
                cls.state.in_(
                    [
                        CommitState.STAGED_CREATION,
                        CommitState.STAGED_EDITION,
                        CommitState.STAGED_DELETION,
                    ]
                ),
                literal(True),
            ),
            else_=literal(False),
        )


class Selection(Base):
    __tablename__ = "selections"
    
    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)
    
    scope: Mapped[ScopeType] = mapped_column(Enum(ScopeType), nullable=False, default=ScopeType.DOCUMENT,)
    state: Mapped[CommitState] = mapped_column(Enum(CommitState), nullable=False, default=CommitState.STAGED_CREATION,)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True,)  # null for all pages
    x: Mapped[float] = mapped_column(Float, nullable=False)  # X coordinate (0-1 normalized)
    y: Mapped[float] = mapped_column(Float, nullable=False)  # Y coordinate (0-1 normalized)
    width: Mapped[float] = mapped_column(Float, nullable=False)  # Width (0-1 normalized)
    height: Mapped[float] = mapped_column(Float, nullable=False)  # Height (0-1 normalized)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True,)  # AI confidence score (Null if user generated)

    document_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("documents.id"), nullable=False,)
    
    document: Mapped["Document"] = relationship("Document", back_populates="selections",)

    @hybrid_property
    def is_staged(self) -> bool:
        return self.state in {CommitState.STAGED_CREATION, CommitState.STAGED_EDITION, CommitState.STAGED_DELETION}

    @is_staged.expression
    def is_staged(cls):
        return case(
            (
                cls.state.in_(
                    [
                        CommitState.STAGED_CREATION,
                        CommitState.STAGED_EDITION,
                        CommitState.STAGED_DELETION,
                    ]
                ),
                literal(True),
            ),
            else_=literal(False),
        )

    @hybrid_property
    def is_ai_generated(self) -> bool:
        return self.confidence is not None

    @is_ai_generated.expression
    def is_ai_generated(cls):
        return case(
            (
                cls.confidence.isnot(None),
                literal(True),
            ),
            else_=literal(False),
        )
    
    @hybrid_property
    def is_global_page(self) -> bool:
        return self.page_number is None

    @is_global_page.expression
    def is_global_page(cls):
        return case(
            (
                cls.page_number.is_(None),
                literal(True),
            ),
            else_=literal(False),
        )


class AiSettings(Base):
    __tablename__ = "ai_settings"
    __table_args__ = (
        UniqueConstraint("project_id", name="uq_ai_settings_project_id"),
    )

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

    project_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("projects.id"), nullable=False,)

    project: Mapped["Project"] = relationship("Project", back_populates="ai_settings",)


class WatermarkSettings(Base):
    __tablename__ = "watermark_settings"
    __table_args__ = (
        UniqueConstraint("project_id", name="uq_watermark_settings_project_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)

    anchor: Mapped[AnchorOption] = mapped_column(Enum(AnchorOption), nullable=False, default=AnchorOption.NW,)
    padding: Mapped[int] = mapped_column(Integer, nullable=False,)
    bg_color: Mapped[str | None] = mapped_column(String(7), nullable=True,)  # hexcolor
    fg_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#ff0000",)  # hexcolor
    text: Mapped[str | None] = mapped_column(String(255), nullable=True, default="Redacted with SERO – MIT Licensed",)
    text_size: Mapped[int | None] = mapped_column(Integer, nullable=True, default=12,)

    project_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("projects.id"), nullable=False,)

    project: Mapped["Project"] = relationship("Project", back_populates="watermark_settings",)


class AnnotationSettings(Base):
    __tablename__ = "annotation_settings"
    __table_args__ = (
        UniqueConstraint("project_id", name="uq_annotation_settings_project_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)

    bg_color: Mapped[str] = mapped_column(String(7), nullable=False, default="#000000",)  # hexcolor
    fg_color: Mapped[str | None] = mapped_column(String(7), nullable=True,)  # hexcolor
    text: Mapped[str | None] = mapped_column(String(255), nullable=True,)
    text_size: Mapped[int | None] = mapped_column(Integer, nullable=True,)
    
    project_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("projects.id"), nullable=False,)

    project: Mapped["Project"] = relationship("Project", back_populates="annotation_settings",)


class Template(Base):
    __tablename__ = "templates"
    __table_args__ = (
        UniqueConstraint("project_id", name="uq_templates_project_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4(),)
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc),)
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True,)

    project_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("projects.id"), nullable=False,)
    document_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("documents.id"), nullable=False,)
    
    project: Mapped["Project"] = relationship("Project", back_populates="template",)
    document: Mapped["Document"] = relationship("Document", back_populates="template",)
