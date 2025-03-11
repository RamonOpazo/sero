from pathlib import Path
from sero import consts


PROJECT_VERSION = "1.0"
SOURCEDIR = Path(__file__).resolve().parent
PATH_TO_DOCSDIR = "./docs"
PATH_TO_OUTDIR = "./output"
PATH_TO_CONFIGFILE = "./sero.toml"
PATH_TO_DBFILE = "./sero.duckdb"
PATH_TO_LICENSE = "./LICENSE"
CROP_BORDER = consts.CROP_BORDER_CHOICES[0]
CROP_GAP = 0
ID_MARKER_HEADER = "ref_id"
ID_MARKER_POS = [10, 16]
ID_MARKER_SIZE = 9
ID_MARKER_COLOR = "#ff3c2e"
TEST_MODE = consts.TEST_MODE_CHOICES[0]
RETRIEVE_MODE = consts.RETRIEVE_MODE_CHOICES[0]
