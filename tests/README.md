# Sero Backend Testing

This directory contains all backend tests for the Sero project. Tests are written using `pytest`.

## How to Run Tests

This repo uses uv for running tests and managing environments. Dev dependencies are installed via `uv sync --all-groups`.

You can run the full test suite using the custom script defined in `pyproject.toml`:

```sh
uv run sero-test
```

To run tests with coverage, use:

```sh
uv run sero-test-cov
```

### Advanced Test Execution

You can pass additional arguments to `pytest` by adding `--` after the `uv run` command. This allows you to use `pytest`'s powerful features for test selection and execution.

#### Running Specific Files or Tests
```sh
# Run all tests in a specific file
uv run pytest tests/test_projects_controller.py

# Run a specific test by its full node ID
uv run pytest tests/test_projects_controller.py::TestProjectsController::test_create_and_get_project_success

# Run all tests with "create" in their name
uv run pytest -k "create"
```

#### Running Tests by Marker
The project defines several custom markers (`slow`, `integration`, `unit`, `api`). You can use these to run specific subsets of tests.

```sh
# Run only the integration tests
uv run pytest -m "integration"

# Run all tests that are NOT marked as slow
uv run pytest -m "not slow"
```

#### Controlling Test Output and Execution
```sh
# Run tests with verbose output to see each test name
uv run pytest -v

# Stop the test run immediately on the first failure
uv run pytest -x

# Show any `print()` statements in the test output
uv run pytest -s
```

## Test Environment and Keyring

- The tests run against a temporary SQLite database and write logs/output to temporary directories.
- The session-scoped autouse fixture in `tests/conftest.py` sets the following environment variables for the process so paths are deterministic and isolated per run:
  - `SERO_DB__FILEPATH` → temp sqlite file
  - `SERO_LOG__FILEPATH` → temp log file
  - `SERO_PROCESSING__DIRPATH` → temp output directory
- The same fixture also monkeypatches `keyring.get_password` and `keyring.set_password` to a simple in-memory store, so tests do not depend on any OS keyring.
- If you want to run tests without that fixture (or in a different process), you can bypass keyring by setting:
  - `export SERO_SECURITY__SECRET_KEY=dev-secret-key`

## Test Architecture and Directives

This section provides guidelines, patterns, and examples so all current and future tests remain consistent, focused, and maintainable.

### Purpose
- Establish a unified testing approach, with controllers as the primary target for unit tests.
- Provide guidelines, patterns, and examples so all current and future tests remain consistent, focused, and maintainable.

### Scope of this pass
- Focus: CONTROLLERS ONLY.
- We will test controller functions directly (not through the FastAPI router) to validate business rules, workflows, and edge cases.
- CRUD and Router layers are covered differently (see below) and are out of scope for this pass except as helpers/fixtures to set up state.

### Layer priorities
1) Controller layer (primary)
   - What: Business rules, workflows, data integrity checks, validation and HTTPException behavior.
   - How: Call controller functions directly with a test Session and input schemas. Assert return values and DB side-effects.
   - Example goal: “When creating a user, ensure email is unique, hash the password, then save.”

2) CRUD layer (lighter)
   - What: Thin DB wrappers. Keep these simple and thoroughly integration-tested with the test DB.
   - How: Limited direct tests to ensure queries and basic operations work as expected (we already have tests for BaseCrud and DB types). Most controller tests will indirectly exercise CRUD in realistic flows.
   - Example: verify get_by_... returns the right record, unique constraints enforced via DB.

3) Router layer (minimal)
   - What: Just enough integration tests with FastAPI TestClient to verify request/response flow, path params and serialization.
   - How: Don’t duplicate controller logic at the router level. The framework machinery is robust; keep these tests lean.

### Test design for controllers
- Call the controller function directly.
- Use the test_session fixture for a real SQLite DB in tests.
- Seed DB state using CRUD or simple ORM models as needed.
- If the controller depends on external services (crypto, AI, etc.), monkeypatch them to stable, deterministic fakes.
- Assert:
  - Return values (schemas)
  - Database side effects (created/updated/deleted rows)
  - Exceptions (HTTPException) with correct status_code and detail where applicable

### Examples

#### 1) Create a Project
This example shows how to test the creation of a new project.

```python
from backend.api.controllers import projects_controller
from backend.api.schemas.projects_schema import ProjectCreate

# Given
project_data = ProjectCreate(
    name="Clinical Trial Alpha",
    description="A project for the Alpha clinical trial.",
    contact_name="Dr. Smith",
    contact_email="dr.smith@example.com",
    password="a-very-secure-password"
)

# When
new_project = projects_controller.create(db=test_session, project_data=project_data)

# Then
assert new_project.name == "Clinical Trial Alpha"
assert new_project.contact_name == "Dr. Smith"
```

#### 2) Upload a Document
This example demonstrates testing the upload of a new document to a project. Note that file data would typically be handled as a stream or byte payload.

```python
from backend.api.controllers import documents_controller
from backend.api.schemas.documents_schema import DocumentCreate, FileCreate

# Given
# (assuming 'project' is a previously created project fixture)
document_data = DocumentCreate(name="patient-records.pdf", project_id=project.id)
file_data = FileCreate(file_name="patient-records.pdf", content_type="application/pdf", file_data=b"...") # file_data would be the PDF content

# When
new_document = documents_controller.create_with_file(
    db=test_session,
    document_data=document_data,
    file_data=file_data,
    password=project_password # The password is required for encryption
)

# Then
assert new_document.name == "patient-records.pdf"
assert new_document.original_file_id is not None
```

#### 3) Define a Template
This example shows how to create a reusable template from an existing document.

```python
from backend.api.controllers import templates_controller
from backend.api.schemas.templates_schema import TemplateCreate

# Given
# (assuming 'project' and 'document' are existing fixtures)
template_data = TemplateCreate(project_id=project.id, document_id=document.id)

# When
new_template = templates_controller.create(db=test_session, template_data=template_data)

# Then
assert new_template.project_id == project.id
assert new_template.document_id == document.id
```

#### 4) Process & Obfuscate a Document
This example shows how to kick off the redaction process for a document.

```python
from backend.api.controllers import documents_controller

# Given
# (assuming 'document' is an existing fixture with committed selections)

# When
processed_document = documents_controller.process_document(db=test_session, document_id=document.id)

# Then
assert processed_document.redacted_file_id is not None
```

#### 5) Download a Secure Document
This example demonstrates how to test the secure download of a file, which requires the project password for decryption.

```python
from backend.api.controllers import files_controller

# Given
# (assuming 'redacted_file' is an existing file fixture)
# (monkeypatching the security manager to avoid actual decryption in test)
monkeypatch.setattr(security_manager, "decrypt_data", lambda data, password: b"decrypted_pdf_content")


# When
file_stream = files_controller.download_file(
    db=test_session,
    file_id=redacted_file.id,
    project_password="a-very-secure-password"
)

# Then
# The controller would return a StreamingResponse, which you can test
# by reading the content.
content = b"".join(file_stream.body_iterator)
assert content == b"decrypted_pdf_content"
```

#### 6) Asserting HTTPException for Error Paths
```python
import pytest
from fastapi import HTTPException, status
from backend.api.controllers import projects_controller
from backend.api.schemas.projects_schema import ProjectUpdate

with pytest.raises(HTTPException) as exc:
    projects_controller.update(db=test_session, project_id=nonexistent_id, project_data=ProjectUpdate(name="x"))

assert exc.value.status_code == status.HTTP_404_NOT_FOUND
assert "not found" in exc.value.detail.lower()
```

### Fixtures and setup
- Use existing fixtures from tests/conftest.py:
  - test_session: SQLAlchemy session bound to a temporary SQLite DB.
  - client / async_client: ONLY for router-level integration tests (not needed for controller unit tests in this pass).
  - sample_* fixtures: reuse where appropriate.
- When you need to seed data, prefer:
  - Creating ORM instances (Project, Document, etc.) and committing with test_session
  - Or using CRUD helpers if that keeps setup concise and realistic

### Naming and structure
- File naming: test_<component>_controller.py for controller-focused tests (e.g., test_documents_controller.py) if you split by controller. Alternatively, keep grouped by API domain (current structure) but ensure tests target controllers directly.
- Test naming: test_<behavior>_<expected_result>
  - Example: test_create_document_success, test_update_project_not_found
- Arrange tests by controller function, group success and error paths close together.

### What to cover for controllers
- Happy paths (full workflow succeeds)
- Error branches per business rule:
  - Resource not found => HTTP 404
  - Invalid credentials / password => HTTP 401
  - Conflicts (duplicates) => HTTP 409
  - Bad requests / validation => HTTP 400 / 422 when appropriate
  - Internal processing failures (decrypt/integrity) => HTTP 500
- Side effects and invariants
  - Deleting/replacing related entities (e.g., redacted files on reprocess)
  - Relationship cache invalidation where relevant (e.g. use db.expire(model, ["rel"]))

### Router tests (minimal, outside this pass)
- A small set of integration tests using TestClient to verify endpoints are wired, status codes, and serialization.
- Do not duplicate controller logic here.

### CRUD tests (lightweight, outside this pass)
- Keep CRUD thin; verify basic behavior using the DB session. Avoid deep business logic in CRUD.

### Do’s and Don’ts
- DO: Test controllers as pure functions with a real test DB session.
- DO: Monkeypatch external services/APIs to deterministic behavior.
- DO: Assert database state changes for workflows.
- DON’T: Re-test the router extensively for controller behavior.
- DON’T: Put business logic into CRUD; keep CRUD thin and straightforward.

### Coverage goals (for controllers in this pass)
- Aim to cover all branches in controller workflows, including error paths.
- Use pytest-cov to measure coverage per controller module; iterate until key workflows and branches are covered.

### Adoption plan
- Update failing or flaky controller tests first (e.g., prompts, projects delete, documents shallow lists) to follow this directive.
- Convert integration-heavy tests to direct controller calls where appropriate.
- Keep a small set of router tests for route wiring.

This directive is the single source of truth for controller tests going forward. Please keep it updated when architecture or patterns evolve.
