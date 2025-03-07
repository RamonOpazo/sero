import argparse
from uuid import UUID
from pathlib import Path

from sero import consts, defaults
from sero.commands import make_obfuscation, make_retrieval, make_config, make_test, make_init, get_sero_version


__version__ = get_sero_version()


def main():
    parser = argparse.ArgumentParser(prog="sero", description="Sero - PDF Data Obfuscator", epilog="Visit the GitHub repository at https://github.com/RamonOpazo/sero.git")
    parser.add_argument("-v", "--version", action="version", version=__version__, help="print out the current version of the program")

    subparsers = parser.add_subparsers(dest="command", title="commands", required=True)

    init_parser = subparsers.add_parser("init", help="initialize a project")
    init_parser.add_argument("dirpath", type=Path, nargs='?', default=".", help="path to project directory")

    setup_parser = subparsers.add_parser("setup", help="create and modify the database manifest")
    setup_parser.add_argument("-n", "--project-name", type=str, required=False, help="project name")
    setup_parser.add_argument("-p", "--project-description", type=str, required=False, help="project description")
    setup_parser.add_argument("-V", "--project-version", type=str, required=False, help="project version")
    setup_parser.add_argument("-N", "--contact-name", type=str, required=False, help="project author/institution's name")
    setup_parser.add_argument("-E", "--contact-email", type=str, required=False, help="project author/institution's email")
    setup_parser.add_argument("-s", "--sourcedir", type=Path, required=False, help="document source directory")
    setup_parser.add_argument("-o", "--outdir", type=Path, required=False, help="output directory")
    setup_parser.add_argument("-f", "--dbfile", type=Path, required=False, help="database filename")
    setup_parser.add_argument("-B", "--anchor-border", choices=consts.ANCHOR_BORDER_CHOICES, required=False, help="border from which to anchor the cropping")
    setup_parser.add_argument("-G", "--anchor-gap", type=int, required=False, help="distance from the cropping anchor to the end of the cropping area")
    setup_parser.add_argument("-H", "--id-marker-header", type=str, required=False, help="identification marker prefix")
    setup_parser.add_argument("-P", "--id-marker-position", type=int, nargs=2, required=False, help="identification marker position; starts at (0, 0) from the top-left corner of the cropping area")
    setup_parser.add_argument("-S", "--id-marker-size", type=int, required=False, help="identification marker font size")
    setup_parser.add_argument("-C", "--id-marker-color", type=str, required=False, help="identification marker font color")

    test_parser = subparsers.add_parser("test", help="allow testing of several document manipulation features")
    test_parser.add_argument("filepath", type=Path, help="PDF file")
    test_parser.add_argument("-t", "--test-type", choices=consts.TEST_ACTION_CHOICES, default=defaults.TEST_ACTION, help=f"Type of data retrieval; defaults to {defaults.TEST_ACTION!r}")
    test_parser.add_argument("-b", "--anchor-border", choices=consts.ANCHOR_BORDER_CHOICES, default=defaults.ANCHOR_BORDER, help=f"Anchor border from which to crop; defaults to {defaults.ANCHOR_BORDER!r}")
    test_parser.add_argument("-g", "--anchor-gap", type=int, default=defaults.ANCHOR_GAP, help=f"Cropping gap from anchor border, in pixels; defaults to {defaults.ANCHOR_GAP}")
    test_parser.add_argument("-r", "--regex", type=str, default=None, help=f"Regex for structured extraction; defaults to {None!r}")

    crop_parser = subparsers.add_parser("crop", help="crop and store PDFs")
    crop_parser.add_argument("pattern", type=str, help="PDF file pattern")
    crop_parser.add_argument("-b", "--anchor-border", choices=consts.ANCHOR_BORDER_CHOICES, default=defaults.ANCHOR_BORDER, help=f"Anchor border from which to crop; defaults to {defaults.ANCHOR_BORDER!r}")
    crop_parser.add_argument("-g", "--anchor-gap", type=int, default=defaults.ANCHOR_GAP, help=f"Cropping gap from anchor border, in pixels; defaults to {defaults.ANCHOR_GAP}")

    retrieve_parser = subparsers.add_parser("retrieve", help="retrieve documents and related data")
    retrieve_parser.add_argument("-o", "--output-path", type=Path, default=defaults.PATH_TO_OUTDIR, help=f"Output dir path; defaults to {defaults.PATH_TO_OUTDIR!r}")
    retrieve_parser.add_argument("-t", "--retrieve-action", choices=consts.RETRIEVE_ACTION_CHOICES, default=defaults.RETRIEVE_ACTION, help=f"Type of data retrieval; defaults to {defaults.RETRIEVE_ACTION!r}")
    retrieve_parser.add_argument("-u", "--uuid", type=UUID, default=None, help=f"UUID of the PDF file to retrieve; defaults to {None!r} (retrieves all PDFs)")

    args = parser.parse_args()

    match args.command:
        case "init":
            make_init(args)
        case "test":
            make_test(args)
        case "setup":
            make_config(args)
        case "crop":
            make_obfuscation(args)
        case "retrieve":
            make_retrieval(args)
    
    exit(0)
    