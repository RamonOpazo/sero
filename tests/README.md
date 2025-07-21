# Sero API Tests

This directory contains comprehensive test suites for the Sero FastAPI project.

## Test Structure

- `conftest.py` - Test configuration and shared fixtures
- `test_projects_api.py` - Tests for Projects API endpoints (22 tests)
- `test_documents_api.py` - Tests for Documents API endpoints (27 tests)
- `test_files_api.py` - Tests for Files API endpoints (33 tests)
- `test_api_errors.py` - Error handling and edge case tests (18 tests)
- `test_integration.py` - Integration tests for complete workflows (8 tests)

**Total: 108 tests** - All passing ✅  
**Code Coverage: 85%** - Excellent test coverage across the entire codebase

## Running Tests

### Run all tests
```bash
# Basic run
uv run pytest

# With quiet output
uv run pytest -q

# With verbose output
uv run pytest -v

# With coverage report (HTML)
uv run pytest --cov=src/sero --cov-report=html

# With coverage report (terminal)
uv run pytest --cov=src/sero --cov-report=term-missing
```

### Run specific test files
```bash
uv run pytest tests/test_projects_api.py
uv run pytest tests/test_integration.py
uv run pytest tests/test_files_api.py
```

### Run specific test classes
```bash
uv run pytest tests/test_projects_api.py::TestProjectsAPI
uv run pytest tests/test_api_errors.py::TestAPIErrorHandling
```

### Run specific test methods
```bash
uv run pytest tests/test_projects_api.py::TestProjectsAPI::test_create_project_success
uv run pytest tests/test_files_api.py::TestFilesAPI::test_download_file_success
```

### Useful pytest options
```bash
# Verbose output with test names
uv run pytest -v

# Stop on first failure
uv run pytest -x

# Stop after N failures
uv run pytest --maxfail=5

# Show local variables on failure
uv run pytest -l

# Disable warnings
uv run pytest --disable-warnings

# Run with timing information
uv run pytest --durations=10

# Generate JUnit XML report
uv run pytest --junit-xml=test-results.xml
```

## Test Coverage

The comprehensive test suite covers all major functionality:

### Projects API (22 tests)
- ✅ **CRUD Operations**: Create, read, update, delete projects
- ✅ **Authentication**: Strong password validation and security
- ✅ **Search & Filtering**: By name, version with pagination
- ✅ **File Management**: Bulk file upload with validation
- ✅ **Summarization**: Project summary endpoints (mocked)
- ✅ **Error Handling**: Invalid inputs, missing fields, not found scenarios
- ✅ **Data Validation**: Email format, UUID validation

### Documents API (27 tests)
- ✅ **CRUD Operations**: Full lifecycle management within projects
- ✅ **Status Management**: Workflow status updates and transitions
- ✅ **Search Functionality**: By project ID, status, and other filters
- ✅ **Processing**: Document processing workflows (mocked)
- ✅ **Summarization**: Document summary generation (mocked)
- ✅ **Pagination**: Consistent pagination across all endpoints
- ✅ **Relationship Integrity**: Proper project-document relationships

### Files API (33 tests)
- ✅ **File Operations**: Create, read, delete with binary data handling
- ✅ **Advanced Search**: Multiple filters (project, document, filename)
- ✅ **Security**: Password-protected file downloads
- ✅ **Content Management**: Prompts and selections CRUD operations
- ✅ **Data Handling**: Base64 encoding for binary data, proper serialization
- ✅ **File Filtering**: Original vs obfuscated file distinctions
- ✅ **Streaming**: File download with proper HTTP streaming responses

### Error Handling & Edge Cases (18 tests)
- ✅ **Database Resilience**: Connection failures, constraint violations
- ✅ **Input Validation**: Malformed JSON, invalid UUIDs, boundary values
- ✅ **Security Testing**: SQL injection prevention, CORS configuration
- ✅ **Performance**: Concurrent request handling, timeout management
- ✅ **Internationalization**: Unicode character support
- ✅ **Data Integrity**: Duplicate handling, referential integrity
- ✅ **HTTP Compliance**: Proper status codes, headers, content types

### Integration Tests (8 tests)
- ✅ **End-to-End Workflows**: Complete entity lifecycles
- ✅ **Hierarchical Relationships**: Project → Document → File chains
- ✅ **Cross-Entity Operations**: Search and filtering across all entities
- ✅ **Data Consistency**: Multi-operation transaction integrity
- ✅ **Cascade Operations**: Proper deletion cascading
- ✅ **Pagination Consistency**: Uniform behavior across all endpoints
- ✅ **Error Propagation**: Proper error handling through relationships

## Test Configuration

Tests are configured for complete isolation and reliability:

### Database Management
- **Isolated Instances**: Each test uses a fresh temporary DuckDB database
- **Automatic Cleanup**: Database files are automatically removed after tests
- **Transaction Isolation**: No test data leaks between test cases
- **Schema Management**: Database schema is initialized for each test session

### FastAPI Integration
- **Dependency Override**: All external dependencies are mocked for testing
- **Test Client**: Uses FastAPI's TestClient for realistic HTTP testing
- **Async Support**: Full support for async endpoints and operations
- **Middleware Testing**: CORS, error handling, and other middleware tested

### Mock Management
- **Security Manager**: Authentication and password validation mocked
- **External Services**: File processing and summarization services mocked
- **Streaming Responses**: File downloads properly mocked with streaming
- **Time-based Operations**: Consistent timestamps for reproducible tests

### Fixtures Available
- `client`: FastAPI test client with all dependencies mocked
- `db`: Database session for direct database operations
- `created_project`: Pre-created project for testing dependent resources
- `created_document`: Pre-created document within a project
- `created_file`: Pre-created file within a document
- `sample_*_data`: Template data for creating resources
- `mock_security_manager`: Mocked security operations

## Development Workflow

### Running tests during development
```bash
# Run tests with file watching (requires pytest-watch)
uv add --dev pytest-watch
uv run ptw

# Run only failed tests from last run
uv run pytest --lf

# Run tests modified since last commit
uv run pytest --git-since=HEAD~1
```

### Debugging failing tests
```bash
# Run with detailed output and stop on first failure
uv run pytest -vvs -x

# Run specific failing test with full traceback
uv run pytest tests/test_files_api.py::TestFilesAPI::test_create_file_success -vvs

# Show local variables in traceback
uv run pytest -l --tb=long
```

## Contributing Guidelines

### Adding New Tests
1. **Naming Convention**: Use descriptive names like `test_operation_scenario`
2. **Test Organization**: Group related tests in classes (e.g., `TestProjectsAPI`)
3. **Use Fixtures**: Leverage existing fixtures from `conftest.py`
4. **Documentation**: Add clear docstrings explaining test purpose
5. **Independence**: Ensure tests can run in any order without dependencies
6. **Error Scenarios**: Test both success and failure paths
7. **Data Cleanup**: Use fixtures for setup/teardown, avoid manual cleanup

### Test Quality Standards
- **Single Responsibility**: Each test should verify one specific behavior
- **Descriptive Assertions**: Use clear assertion messages
- **Proper Mocking**: Mock external dependencies, test real business logic
- **Edge Cases**: Include boundary conditions and error scenarios
- **Performance**: Avoid unnecessary delays, use mocking for slow operations

### Before Submitting
```bash
# Run all tests to ensure nothing is broken
uv run pytest

# Check test coverage
uv run pytest --cov=src/sero --cov-report=term-missing

# Generate HTML coverage report for detailed analysis
uv run pytest --cov=src/sero --cov-report=html
# Open .coverage_html/index.html in your browser to view the detailed coverage report

# Ensure tests pass with different pytest options
uv run pytest -x --disable-warnings
```
