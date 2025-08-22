# Sero Test Architecture DIRECTIVE

Purpose
- Establish a unified testing approach, with controllers as the primary target for unit tests.
- Provide guidelines, patterns, and examples so all current and future tests remain consistent, focused, and maintainable.

Scope of this pass
- Focus: CONTROLLERS ONLY.
- We will test controller functions directly (not through the FastAPI router) to validate business rules, workflows, and edge cases.
- CRUD and Router layers are covered differently (see below) and are out of scope for this pass except as helpers/fixtures to set up state.

Layer priorities
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

Test design for controllers
- Call the controller function directly.
- Use the test_session fixture for a real SQLite DB in tests.
- Seed DB state using CRUD or simple ORM models as needed.
- If the controller depends on external services (crypto, AI, etc.), monkeypatch them to stable, deterministic fakes.
- Assert:
  - Return values (schemas)
  - Database side effects (created/updated/deleted rows)
  - Exceptions (HTTPException) with correct status_code and detail where applicable

Examples
1) Direct controller call with success path
```python path=null start=null
from sqlalchemy.orm import Session
from backend.api.controllers import documents_controller
from backend.api.schemas.documents_schema import DocumentCreate

# Given
doc_in = DocumentCreate(name="foo.pdf", description=None, project_id=project_id)

# When
doc_out = documents_controller.create(db=test_session, document_data=doc_in)

# Then
assert doc_out.name == "foo.pdf"
assert doc_out.project_id == project_id
# Optionally confirm DB side-effects using the session
```

2) Asserting HTTPException for error paths
```python path=null start=null
import pytest
from fastapi import HTTPException, status
from backend.api.controllers import projects_controller
from backend.api.schemas.projects_schema import ProjectUpdate

with pytest.raises(HTTPException) as exc:
    projects_controller.update(db=test_session, project_id=nonexistent_id, project_data=ProjectUpdate(name="x"))

assert exc.value.status_code == status.HTTP_404_NOT_FOUND
assert "not found" in exc.value.detail.lower()
```

3) Monkeypatching external services
```python path=null start=null
# Example: forcing a password decryptor to return a known value
monkeypatch.setattr(security_manager, "decrypt_with_ephemeral_key", lambda key_id, encrypted: "KnownPassword!")
```

Fixtures and setup
- Use existing fixtures from tests/conftest.py:
  - test_session: SQLAlchemy session bound to a temporary SQLite DB.
  - client / async_client: ONLY for router-level integration tests (not needed for controller unit tests in this pass).
  - sample_* fixtures: reuse where appropriate.
- When you need to seed data, prefer:
  - Creating ORM instances (Project, Document, etc.) and committing with test_session
  - Or using CRUD helpers if that keeps setup concise and realistic

Naming and structure
- File naming: test_<component>_controller.py for controller-focused tests (e.g., test_documents_controller.py) if you split by controller. Alternatively, keep grouped by API domain (current structure) but ensure tests target controllers directly.
- Test naming: test_<behavior>_<expected_result>
  - Example: test_create_document_success, test_update_project_not_found
- Arrange tests by controller function, group success and error paths close together.

What to cover for controllers
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

Router tests (minimal, outside this pass)
- A small set of integration tests using TestClient to verify endpoints are wired, status codes, and serialization.
- Do not duplicate controller logic here.

CRUD tests (lightweight, outside this pass)
- Keep CRUD thin; verify basic behavior using the DB session. Avoid deep business logic in CRUD.

Do’s and Don’ts
- DO: Test controllers as pure functions with a real test DB session.
- DO: Monkeypatch external services/APIs to deterministic behavior.
- DO: Assert database state changes for workflows.
- DON’T: Re-test the router extensively for controller behavior.
- DON’T: Put business logic into CRUD; keep CRUD thin and straightforward.

Coverage goals (for controllers in this pass)
- Aim to cover all branches in controller workflows, including error paths.
- Use pytest-cov to measure coverage per controller module; iterate until key workflows and branches are covered.

Adoption plan
- Update failing or flaky controller tests first (e.g., prompts, projects delete, documents shallow lists) to follow this directive.
- Convert integration-heavy tests to direct controller calls where appropriate.
- Keep a small set of router tests for route wiring.

This directive is the single source of truth for controller tests going forward. Please keep it updated when architecture or patterns evolve.

