from pathlib import Path


ANCHOR_BORDER_CHOICES = [ "top", "bottom" ]
ANCHOR_BORDER = ANCHOR_BORDER_CHOICES[0]
ANCHOR_GAP = 0
DATA_EXTRACTION_REGEX = None
DESCRIPTION = None
ID_MARKER_POS = (10, 16)
ID_MARKER_HEADER = "ref_id"
ID_MARKER_SIZE = 9
ID_MARKER_COLOR = (0.9, 0.1, 0.2)
PATH_TO_DBFILE = Path("./data.db")
PATH_TO_OUTDIR = Path("./output")
RETRIEVE_TYPE_CHOICES = [ "summary:console", "data:console", "data:file", "documents:file" ]
RETRIEVE_TYPE = RETRIEVE_TYPE_CHOICES[0]
TEST_TYPE_CHOICES = [ "cropping", "extraction" ]
TEST_TYPE = TEST_TYPE_CHOICES[0]
NORMALIZED_UUID = None
