import sys
import logging
from loguru import logger

from sero.core.config import settings


class _InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        # Get corresponding Loguru level if it exists.
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message.
        frame, depth = logging.currentframe(), 0
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def _custom_formatter(record):
    level_colon = f"{record['level'].name}:"
    padded_level = f"{level_colon:<9}"
    return f"{padded_level} <green>{record['time']:YYYY-MM-DDTHH:mm:ss.SSSZ}</green> - <cyan>{record['name']}</cyan>:<cyan>{record['function']}</cyan> - <level>{record['message']}</level>\n"


def init_logging():
    # disable handlers for specific uvicorn loggers
    # to redirect their output to the default uvicorn logger
    # and using the intercepted handler.
    logging.getLogger("uvicorn.access").handlers = []
    logging.getLogger("uvicorn.error").handlers = []

    # change handler for default uvicorn logger
    intercept_handler = _InterceptHandler()
    logging.getLogger("uvicorn").handlers = [intercept_handler]

    # set logs output, level and format
    logger.configure(
        handlers=[
            {
                "sink": sys.stdout,
                "level": settings.log.level,
                "format": _custom_formatter,
            },
            {
                "sink": settings.log.filepath.absolute(),
                "level": settings.log.level,
                "rotation": "10 MB",
                "retention": "10 days",
                "serialize": True
            }
        ]
    )
