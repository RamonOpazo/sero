from enum import StrEnum, auto


class ProjectStatus(StrEnum):
    AWAITING = auto()
    IN_PROGRESS = auto()
    COMPLETED = auto()


class DocumentStatus(StrEnum):
    PENDING = auto()
    PROCESSED = auto()
    FAILED = auto()


class PromptLanguage(StrEnum):
    CATALONIAN = auto()
    CASTILLIAN = auto()
    ENGLISH = auto()


class FileType(StrEnum):
    ORIGINAL = auto()
    REDACTED = auto()
