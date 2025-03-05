import argparse
from uuid import UUID
from pathlib import Path

from sero import defaults
from sero.commands import Cropper, Retriever, Setuper, Trier


def main():
    parser = argparse.ArgumentParser(prog="sero", description="Sero - PDF Data Obfuscator")

    subparsers = parser.add_subparsers(dest="command", required=True)

    crop_parser = subparsers.add_parser("crop", help="Crop and store PDFs")
    crop_parser.add_argument("pattern", type=str, help="PDF file pattern")
    crop_parser.add_argument("-d", "--database-path", type=Path, default=defaults.PATH_TO_DBFILE, help=f"Database file path; defaults to {defaults.PATH_TO_DBFILE.as_posix()!r}")
    crop_parser.add_argument("-b", "--anchor-border", choices=defaults.ANCHOR_BORDER_CHOICES, default=defaults.ANCHOR_BORDER, help=f"Anchor border from which to crop; defaults to {defaults.ANCHOR_BORDER!r}")
    crop_parser.add_argument("-g", "--anchor-gap", type=int, default=defaults.ANCHOR_GAP, help=f"Cropping gap from anchor border, in pixels; defaults to {defaults.ANCHOR_GAP}")
    crop_parser.add_argument("-r", "--regex", type=str, default=defaults.DATA_EXTRACTION_REGEX, help=f"Regex for structured extraction; defaults to {defaults.DATA_EXTRACTION_REGEX!r}")
    crop_parser.add_argument("-s", "--description", type=str, default=defaults.DESCRIPTION, help=f"Database description; defaults to {defaults.DESCRIPTION!r}")

    try_cropping_parser = subparsers.add_parser("try-cropping", help="Help create appropriate data extraction regex")
    try_cropping_parser.add_argument("file", type=Path, help="PDF file")
    try_cropping_parser.add_argument("-b", "--anchor-border", choices=defaults.ANCHOR_BORDER_CHOICES, default=defaults.ANCHOR_BORDER, help=f"Anchor border from which to crop; defaults to {defaults.ANCHOR_BORDER!r}")
    try_cropping_parser.add_argument("-g", "--anchor-gap", type=int, default=defaults.ANCHOR_GAP, help=f"Cropping gap from anchor border, in pixels; defaults to {defaults.ANCHOR_GAP}")

    try_extraction_parser = subparsers.add_parser("try-extraction", help="Help create appropriate data extraction regex")
    try_extraction_parser.add_argument("file", type=Path, help="PDF file")
    try_extraction_parser.add_argument("-b", "--anchor-border", choices=defaults.ANCHOR_BORDER_CHOICES, default=defaults.ANCHOR_BORDER, help=f"Anchor border from which to crop; defaults to {defaults.ANCHOR_BORDER!r}")
    try_extraction_parser.add_argument("-g", "--anchor-gap", type=int, default=defaults.ANCHOR_GAP, help=f"Cropping gap from anchor border, in pixels; defaults to {defaults.ANCHOR_GAP}")
    try_extraction_parser.add_argument("-r", "--regex", type=str, help="Regex for structured extraction")

    setup_parser = subparsers.add_parser("setup", help="Create and modify metadata")
    setup_parser.add_argument("-d", "--database-path", type=Path, default=defaults.PATH_TO_DBFILE, help=f"Database file path; defaults to {defaults.PATH_TO_DBFILE.as_posix()!r}")
    setup_parser.add_argument("-r", "--regex", type=str, default=defaults.DATA_EXTRACTION_REGEX, help=f"Regex for structured extraction; defaults to {defaults.DATA_EXTRACTION_REGEX!r}")
    setup_parser.add_argument("-s", "--description", type=str, default=defaults.DESCRIPTION, help=f"Database description; defaults to {defaults.DESCRIPTION!r}")

    retrieve_parser = subparsers.add_parser("retrieve", help="Retrieve documents and related data")
    retrieve_parser.add_argument("-d", "--database-path", type=Path, default=defaults.PATH_TO_DBFILE, help=f"Database file path; defaults to {defaults.PATH_TO_DBFILE.as_posix()!r}")
    retrieve_parser.add_argument("-o", "--output-path", type=Path, default=defaults.PATH_TO_OUTDIR, help=f"Output dir path; defaults to {defaults.PATH_TO_OUTDIR.as_posix()!r}")
    retrieve_parser.add_argument("-t", "--retrieve-type", choices=defaults.RETRIEVE_TYPE_CHOICES, default=defaults.RETRIEVE_TYPE, help=f"Type of data retrieval; defaults to {defaults.RETRIEVE_TYPE!r}")
    retrieve_parser.add_argument("-u", "--uuid", type=UUID, default=defaults.NORMALIZED_UUID, help=f"UUID of the PDF file to retrieve; defaults to {defaults.NORMALIZED_UUID!r} (retrieves all PDFs)")

    args = parser.parse_args()

    match args.command:
        case "setup" | "crop":
            setuper = Setuper(args)
            setuper.configure_metadata()
        case "crop":
            cropper = Cropper(args)
            cropper.obfuscate_docs()
        case "try-cropping":
            trier = Trier(args)
            trier.attempt_document_cropping()
        case "try-extraction":
            trier = Trier(args)
            trier.attempt_data_extraction()
        case "retrieve":
            retriever = Retriever(args)
            retriever.recover_docs()
    
    exit(0)
    