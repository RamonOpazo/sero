from enum import StrEnum, auto


class DocumentStatus(StrEnum):
    PENDING = auto()
    PROCESSED = auto()
    FAILED = auto()


class PromptLanguage(StrEnum):
    CATALONIAN = auto()
    CASTILLIAN = auto()
    ENGLISH = auto()
