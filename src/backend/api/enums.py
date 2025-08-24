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


class ScopeType(StrEnum):
    PROJECT = auto()
    DOCUMENT = auto()


class CommitState(StrEnum):
    STAGED_CREATION = auto()
    STAGED_EDITION = auto()
    STAGED_DELETION = auto()
    COMMITTED = auto()


class AnchorOption(StrEnum):
    NW = auto()
    NE = auto()
    SE = auto()
    SW = auto()
    ZH = auto()
