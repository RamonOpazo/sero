# Sero

![GitHub License](https://img.shields.io/github/license/RamonOpazo/sero)
![Python](https://img.shields.io/badge/python-3.13%2B-blue)
![DuckDB Badge](https://img.shields.io/badge/duck--db-orange)

## Overview

Sero (/'se.ro/) is a command-line tool for document obfuscation and data extraction. It allows the redaction of PDF files in order to obfuscate sensitive or private information, thus rendering the document safe for use in a public setting.

## Features

- **Document obfuscation** – Obfuscate sensitive or private data.
- **Structured Data Extraction** – Uses regex patterns to extract structured data from obfuscated areas.
- **Secure PDF Storage** – Saves documents as blobs in a database.
- **Flexible Retrieval** – Allows fetching previously processed documents and structured data.

## Installation

The repository contains an installer to ease the process. Note that because `uv` is needed for the installation (more info [here](https://docs.astral.sh/uv/)), the installer will automatically resolve this dependency and prompt you whether to install it or not.

```sh
curl -LsSf https://raw.githubusercontent.com/RamonOpazo/sero/refs/heads/master/install.sh | sh
```

Alternatively, you can install `sero` from source:

```sh
git clone https://github.com/RamonOpazo/sero.git
cd sero
uv build
uv tool install dist/sero-*.tar.gz
```

## Quick Start

Run `sero --help` to see available commands:

```sh
sero --help
```

### The `crop` Command

Running `crop` allows to obfuscate (or crop the data out) all the text fields that fall inside the cropping area defined by `--anchor-border` and `--anchor-gap`:

```sh
sero crop "./data/*.pdf" --database-path ./data.db --anchor-border "top" --anchor-gap 250 --description "My PDF Dataset"
```

More information can be found in:

```sh
sero crop --help
```

### The `retrieve` Command

In order to retrieve, say, the stored obfuscated PDFs, you can use the `retrieve` command:

```sh
sero retrieve --database-path ./data.db --output-path ./output --retrieve-type "documents:file"
```

Other type of retrieval options allow for different data so, accordingly, don't forget to check the documentation:

```sh
sero crop --help
```

There are more commands to explore but, suffice it to say, these two should get you covered in the beggining.

## Command-Line Usage

### `crop` - Crop and Store PDFs

```sh
sero crop <pattern> [-d DATABASE_PATH] [-b BORDER] [-g GAP] [-r REGEX] [-s DESCRIPTION]
```

- `pattern`: PDF file pattern (e.g., `*.pdf`)
- `-d, --database-path`: Path to the database file (default: `sero.db`)
- `-b, --anchor-border`: Anchor border for cropping
- `-g, --anchor-gap`: Cropping gap from anchor (pixels)
- `-r, --regex`: Regex for structured data extraction
- `-s, --description`: Description of the dataset

### `test` - Test Document Manipulation Features

```sh
sero test <file> [-t TEST_TYPE] [-b BORDER] [-g GAP] [-r REGEX]
```

- `file`: PDF file to test
- `-t, --test-type`: Type of data retrieval
- `-b, --anchor-border`: Anchor border for cropping
- `-g, --anchor-gap`: Cropping gap from anchor (pixels)
- `-r, --regex`: Regex for structured extraction

### `setup` - Configure Metadata

```sh
sero setup [-d DATABASE_PATH] [-r REGEX] [-s DESCRIPTION]
```

- `-d, --database-path`: Path to the database file (default: `sero.db`)
- `-r, --regex`: Regex for structured data extraction
- `-s, --description`: Description of the dataset

### `retrieve` - Retrieve Stored PDFs and Structured Data

```sh
sero retrieve [-d DATABASE_PATH] [-o OUTPUT_PATH] [-t RETRIEVE_TYPE] [-u UUID]
```

- `-d, --database-path`: Path to the database file (default: `sero.db`)
- `-o, --output-path`: Directory to store retrieved files
- `-t, --retrieve-type`: Type of retrieval (all, metadata, etc.)
- `-u, --uuid`: UUID of the PDF file to retrieve (default: all PDFs)

## Database Schema

Sero uses a DuckDB database with the following structure:

### `units` Table

Stores information about processed PDFs.

```sql
CREATE TABLE units (
    id UUID PRIMARY KEY,
    created_at DATETIME,
    file_name TEXT,
    cropped_text TEXT
);
```

### `documents` Table

Stores the actual PDF files as blobs.

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    unit_id UUID REFERENCES units(id),
    created_at DATETIME,
    data BLOB
);
```

### `metadata` Table

Stores regex patterns and dataset descriptions.

```sql
CREATE TABLE metadata (
    id UUID PRIMARY KEY,
    created_at DATETIME,
    description TEXT,
    regex TEXT
);
```

## License

Sero is licensed under the MIT License.

---

## Sample commands

```sh
sero init
sero test docs/primer.pdf -m cropping -b top -g 220
sero setup -p 1:3
sero test docs/primer.pdf -m extraction -b top -g 220 -r "Núm. H.C.: (?P<hc>\d+)|CIP: (?P<cip>[A-Z0-9]+)|D. Naixement \(Edat\): (?P<birth_date>\d+/\d+/\d+)|Sexe: (?P<sex>\w+)|Data Obtenció: (?P<proc_date>\d+/\d+/\d+)|Núm\. Estudi:\s+(?P<num_corr>[A-Z0-9]+)" | tail -n 1 | jq
sero crop docs/*.pdf
sero retrieve -m summary:console
sero retrieve -m data:console -r "Núm. H.C.: (?P<hc>\d+)|CIP: (?P<cip>[A-Z0-9]+)|D. Naixement \(Edat\): (?P<birth_date>\d+/\d+/\d+)|Sexe: (?P<sex>\w+)|Data Obtenció: (?P<proc_date>\d+/\d+/\d+)|Núm\. Estudi:\s+(?P<num_corr>[A-Z0-9]+)" | tail -n 1 | jq
```