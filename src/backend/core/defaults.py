from pathlib import Path


BASE_PATH = Path(".temp")
KEYRING_SERVICE_NAME = "io.github.ramonopazo.sero"
KEYRING_KEY_NAME = "app-secret-key"

# Minimum confidence threshold for AI-generated selections (0..1)
# Used to filter detections before staging. Conservative by default.
AI_MIN_CONFIDENCE: float = 0.35
