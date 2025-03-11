from pathlib import Path


SOURCEDIR = Path(__file__).resolve().parent

CONFIGFILE = "./sero.toml"

CROP_BORDER_CHOICES = [
    "top",
    "bottom"
]

TEST_MODE_CHOICES = [
    "cropping",
    "extraction"
]

RETRIEVE_MODE_CHOICES = [
    "summary:console",
    "data:console",
    "data:file",
    "documents:file"
]

HTML_COLOR_NAMES = {
    "black": "#000000",
    "white": "#FFFFFF",
    "red": "#FF0000",
    "lime": "#00FF00",
    "blue": "#0000FF",
    "yellow": "#FFFF00",
    "cyan": "#00FFFF",
    "magenta": "#FF00FF",
    "silver": "#C0C0C0",
    "gray": "#808080",
    "maroon": "#800000",
    "olive": "#808000",
    "green": "#008000",
    "purple": "#800080",
    "teal": "#008080",
    "navy": "#000080",
    "orange": "#FFA500",
    "pink": "#FFC0CB",
    "brown": "#A52A2A"
}

DB_LICENSES = {
    'ODbL': {
        'name': 'Open Database License (ODbL 1.0)',
        'link': 'https://opendatacommons.org/licenses/odbl/1-0/',
        'description': 'Requires attribution, ensures modifications are shared under the same terms, and restricts re-identification of anonymized data.'
    },
    'ODC-By': {
        'name': 'Open Data Commons Attribution License (ODC-By 1.0)',
        'link': 'https://opendatacommons.org/licenses/by/1-0/',
        'description': 'Allows users to modify, distribute, and commercially use the database, as long as they credit you as the original creator.'
    },
    'CC-BY-NC': {
        'name': 'Creative Commons Attribution-NonCommercial (CC BY-NC 4.0)',
        'link': 'https://creativecommons.org/licenses/by-nc/4.0/',
        'description': 'Allows users to modify and redistribute the database for **non-commercial** purposes only, with credit to you.'
    },
    'CC-BY-SA': {
        'name': 'Creative Commons Attribution-ShareAlike (CC BY-SA 4.0)',
        'link': 'https://creativecommons.org/licenses/by-sa/4.0/',
        'description': 'Requires credit and share-alike for modifications, while allowing commercial use, with the same terms for derived works.'
    }
}
