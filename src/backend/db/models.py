import uuid
from datetime import datetime, timezone
from sqlalchemy import Text, DateTime, ForeignKey, BLOB, String, Integer, Float, Uuid, ARRAY, Boolean, event
from sqlalchemy.orm import Session, Mapped, declarative_base, mapped_column, relationship
from sqlalchemy.engine import Connection


Base = declarative_base()


class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[Uuid] = mapped_column(Uuid, primary_key=True, default=lambda: uuid.uuid4())
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    contact_name: Mapped[str] = mapped_column(String(100), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[bytes] = mapped_column(BLOB, nullable=False)

    documents: Mapped[list["Document"]] = relationship("Document", back_populates="project", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[Uuid] = mapped_column(Uuid, primary_key=True, default=lambda: uuid.uuid4())
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    project_id: Mapped[Uuid] = mapped_column(ForeignKey("projects.id"), nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="documents")
    files: Mapped[list["File"]] = relationship("File", back_populates="document", cascade="all, delete-orphan", order_by="File.created_at")

    def _validate_max_files(self) -> None:
        if len(self.files) > 2:
            document_id = self.id or "[new]"
            raise ValueError(f"Document ID {document_id!r} cannot have more than 2 files")
        
    @property
    def original_file(self) -> "File | None":
        return next((i for i in self.files if i.is_original_file), None)
    
    @property
    def obfuscated_file(self) -> "File | None":
        return next((i for i in self.files if not i.is_original_file), None)
    

class File(Base):
    __tablename__ = "files"

    id: Mapped[Uuid] = mapped_column(Uuid, primary_key=True, default=lambda: uuid.uuid4())
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    data: Mapped[bytes] = mapped_column(BLOB, nullable=False)
    is_original_file: Mapped[bool] = mapped_column(Boolean, nullable=False)  # as opposed to obfuscated
    salt: Mapped[bytes] = mapped_column(BLOB, nullable=False)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256

    document_id: Mapped[Uuid] = mapped_column(ForeignKey("documents.id"), nullable=False)

    document: Mapped["Document"] = relationship("Document", back_populates="files")
    selections: Mapped[list["Selection"]] = relationship("Selection", back_populates="file")
    prompts: Mapped[list["Prompt"]] = relationship("Prompt", back_populates="file")

    @property
    def size(self) -> int:
        return int((len(self.data) / 4) * 3) if self.data else 0
    
    def populate_filename(self, connection: Connection):
        if self.filename is None:
            filename = f"{self.id}.pdf"
            connection.execute(
                self.__table__.update()
                .where(self.__table__.c.id == self.id)
                .values(filename=filename)
            )
    

class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[Uuid] = mapped_column(Uuid, primary_key=True, default=lambda: uuid.uuid4())
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    label: Mapped[str] = mapped_column(String(100), nullable=True)  # User-defined label
    text: Mapped[str] = mapped_column(Text, nullable=False)
    languages: Mapped[list[str]] = mapped_column(ARRAY(String(20)), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=False)

    file_id: Mapped[Uuid] = mapped_column(ForeignKey("files.id"), nullable=True)

    file: Mapped["File"] = relationship("File", back_populates="prompts")


class Selection(Base):
    __tablename__ = "selections"
    
    id: Mapped[Uuid] = mapped_column(Uuid, primary_key=True, default=lambda: uuid.uuid4())
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    label: Mapped[str] = mapped_column(String(100), nullable=True)  # User-defined label
    page_number: Mapped[int] = mapped_column(Integer, nullable=True)  # null for all pages
    x: Mapped[float] = mapped_column(Float, nullable=False)  # X coordinate (0-1 normalized)
    y: Mapped[float] = mapped_column(Float, nullable=False)  # Y coordinate (0-1 normalized)
    width: Mapped[float] = mapped_column(Float, nullable=False)  # Width (0-1 normalized)
    height: Mapped[float] = mapped_column(Float, nullable=False)  # Height (0-1 normalized)
    confidence: Mapped[float] = mapped_column(Float, nullable=True)  # AI confidence score (1 if user source)

    file_id: Mapped[Uuid] = mapped_column(ForeignKey("files.id"), nullable=True)

    file: Mapped["File"] = relationship("File", back_populates="selections")

    @property
    def is_ai_generated(self) -> bool:
        return self.confidence is not None


@event.listens_for(Session, "before_flush")
def enforce_max_files_per_document(session: Session, _flush_context, _instances) -> None:
    for obj in session.new:
        if isinstance(obj, File) and obj.document:
            obj.document._validate_max_files()


@event.listens_for(File, "after_insert")
def populate_filename(_mapper, connection: Connection, target: "File") -> None:
    if target.filename is None:
        connection.execute(
            File.__table__.update()
            .where(File.id == target.id)
            .values(filename=str(target.id))
        )
