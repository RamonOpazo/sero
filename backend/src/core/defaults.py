from pathlib import Path
from platformdirs import PlatformDirs

# Application identity
APP_NAME = "sero"
APP_AUTHOR = "io.github.ramonopazo"

# Resolve platform-appropriate directories (per-user)
_DIRS = PlatformDirs(appname=APP_NAME, appauthor=APP_AUTHOR, roaming=False)
DATA_DIR: Path = Path(_DIRS.user_data_dir)           # e.g., ~/.local/share/sero
STATE_DIR: Path = Path(_DIRS.user_state_dir)         # e.g., ~/.local/state/sero
CONFIG_DIR: Path = Path(_DIRS.user_config_dir)       # e.g., ~/.config/sero

# Backwards-compatible base path (was .temp). Use DATA_DIR as the base for app data.
BASE_PATH: Path = DATA_DIR

# Specific resources
OUTPUT_DIR: Path = DATA_DIR / "output"
LOG_DIR: Path = STATE_DIR / "logs"
DB_FILE: Path = DATA_DIR / "sero.sqlite"
LOG_FILE: Path = LOG_DIR / "app.jsonl"

# Keyring configuration
KEYRING_SERVICE_NAME = "io.github.ramonopazo.sero"
KEYRING_KEY_NAME = "app-secret-key"

# Minimum confidence threshold for AI-generated selections (0..1)
# Used to filter detections before staging. Conservative by default.
AI_MIN_CONFIDENCE: float = 0.35
