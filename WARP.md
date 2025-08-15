# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Sero is a secure FastAPI-based document privacy protection service that "Evilishly Redacts and Obfuscates" PDF documents. It provides end-to-end encryption, project-based organization, and template-driven processing for sensitive document handling.

## Development Commands

### Core Commands
```bash
# Start development server with hot reload
uv run sero-dev

# Start production server
uv run sero

# Run all tests
uv run sero-test

# Run tests with coverage report (generates HTML in .coverage_html/)
uv run sero-test-cov

# Initialize database
uv run sero-db-init

# Show version information
uv run sero-version
```

### Test Commands
```bash
# Run all tests (quieter output)
uv run pytest -q

# Run specific test file
uv run pytest tests/test_projects_api.py

# Run specific test class
uv run pytest tests/test_files_api.py::TestFilesAPI

# Run specific test method
uv run pytest tests/test_integration.py::TestIntegration::test_complete_workflow

# Run with verbose output and stop on first failure
uv run pytest -vvs -x

# Run tests with coverage (terminal output)
uv run pytest --cov=src/backend --cov-report=term-missing
```

### Package Management
```bash
# Install dependencies and create virtual environment
uv sync

# Install with dev dependencies
uv sync --all-groups

# Add new dependency
uv add package-name

# Add dev dependency
uv add --group dev package-name
```

## Architecture Overview

### Project Structure
- **`src/backend/`** - Main application code
  - **`api/`** - API layer (routers, controllers, schemas)
  - **`core/`** - Core services (config, database, security, logging)
  - **`crud/`** - Database operations with SQLAlchemy
  - **`db/`** - Database models and custom types
- **`tests/`** - Comprehensive test suite (108 tests, 85% coverage)
- **`docs/`** - Documentation including ER diagrams

### Core Components

#### Database Architecture
- **SQLite** with WAL mode for development (configured in `core/database.py`)
- **DuckDB** support via `duckdb-engine` for analytics workloads
- **SQLAlchemy 2.0** with modern typed relationships
- **Entity hierarchy**: Projects → Documents → Files + Prompts + Selections

#### Security Model
- **Project-based isolation** with password-derived encryption keys
- **Fernet symmetric encryption** for document storage
- **bcrypt password hashing** with secure salt generation
- **Secret key management** via filesystem or keyring

#### API Design
- **FastAPI** with automatic OpenAPI documentation at `/docs`
- **RESTful endpoints** under `/api/{resource}` prefixes
- **Pydantic schemas** for request/response validation
- **CORS middleware** configured for single-origin access

### Key Data Flow

1. **Project Creation**: User creates project with strong password → password hashed with bcrypt
2. **Document Upload**: PDF files encrypted with project-derived key using Fernet
3. **Template Processing**: Selection rectangles and AI prompts define obfuscation areas
4. **File Processing**: Original documents processed to create redacted versions
5. **Secure Download**: Files decrypted on-demand with correct project password

## Development Guidelines

### Database Operations
- Use CRUD classes in `crud/` directory for all database operations
- All models inherit from SQLAlchemy `Base` with UUID primary keys
- Custom types: `UUIDBytes`, `JSONList`, `AwareDateTime` handle complex data
- Database initialization handled automatically via lifespan events

### Testing Patterns
- **Isolation**: Each test uses fresh temporary database
- **Fixtures**: Comprehensive fixtures in `conftest.py` for common test data
- **Mocking**: External services (AI, file processing) mocked for deterministic tests
- **Coverage**: Target 85%+ coverage, currently achieved across all modules

### Security Considerations
- Never commit encryption keys or passwords
- Use `backend.core.security` for all cryptographic operations
- Project passwords must be provided for file decryption
- All file uploads validated against MIME type whitelist

### API Development
- Controllers in `api/controllers/` handle business logic
- Routers in `api/routers/` define FastAPI endpoints
- Schemas in `api/schemas/` define request/response models
- Use dependency injection for database sessions and security services

## Configuration

### Environment Variables
Configuration managed via `pydantic-settings` in `core/config.py`:
- `default_origin` - CORS origin (default: http://localhost:8000)
- `is_debug_mode` - Debug mode flag (default: True)
- Database, logging, AI, and processing settings configurable via `.env`

### Default Paths
- **Database**: `{BASE_PATH}/sero.sqlite` (SQLite with WAL mode)
- **Logs**: `{BASE_PATH}/logs/app.jsonl` (structured JSON logging)
- **Output**: `{BASE_PATH}/output/` (processed files)
- **Secret Key**: `{BASE_PATH}/.secret_key` (auto-generated)

## Release Process

### Conventional Commits
- **`fix:`** → Patch version bump (0.1.0 → 0.1.1)
- **`feat:`** → Minor version bump (0.1.0 → 0.2.0)  
- **`feat!:` or `BREAKING CHANGE:`** → Major version bump (0.1.0 → 1.0.0)
- **`docs:`, `style:`, `refactor:`, `test:`** → No version bump

### Automated Release
GitHub Actions workflow on main branch:
1. Runs full test suite with `uv run pytest`
2. Uses `python-semantic-release` for version bumping
3. Generates `CHANGELOG.md` automatically
4. Creates GitHub releases with semantic versioning
5. PyPI publishing configured but currently disabled

### Manual Testing Workflow
```bash
# Run complete validation before pushing
uv run sero-test-cov
# Check coverage report in .coverage_html/index.html
# Ensure all tests pass and coverage remains above 85%
```

## Common Development Tasks

### Adding New API Endpoints
1. Define Pydantic schemas in `api/schemas/`
2. Implement CRUD operations in `crud/`
3. Create controller logic in `api/controllers/`
4. Add FastAPI router in `api/routers/`
5. Include router in `app.py`
6. Write comprehensive tests covering success/error cases

### Database Schema Changes
1. Update models in `db/models.py`
2. Consider migration strategy (currently using `db_manager.init()`)
3. Update corresponding CRUD operations
4. Add tests for new functionality
5. Update API schemas if needed

### Working with Encrypted Files
- Use `backend.core.security.SecurityManager` for encryption/decryption
- Always validate project passwords before file operations
- Handle `cryptography` exceptions appropriately
- Test with various file sizes and types

### Adding New Dependencies
```bash
# Add runtime dependency
uv add new-package

# Add development dependency  
uv add --group dev new-dev-package

# Lock dependencies
uv lock
```

## Service Integration

### API Access
- **Development**: http://localhost:8000 (with hot reload)
- **Production**: http://0.0.0.0:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)
- **API Schema**: http://localhost:8000/openapi.json

### Database Management
- SQLite database auto-created on first run
- Use `uv run sero-db-init` to manually initialize
- Database location configurable via settings
- WAL mode enabled for better concurrency

