# Contributing to Sero

## Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic version bumping and changelog generation.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types and Version Bumping

| Type | Version Bump | Example |
|------|-------------|---------|
| `fix:` | Patch (0.1.0 → 0.1.1) | `fix: resolve database connection timeout` |
| `feat:` | Minor (0.1.0 → 0.2.0) | `feat: add document obfuscation algorithm` |
| `feat!:` or `BREAKING CHANGE:` | Major (0.1.0 → 1.0.0) | `feat!: redesign API authentication` |
| `docs:`, `style:`, `refactor:`, `test:` | No bump | `docs: update API documentation` |

### Examples

```bash
# Patch version bump (bug fixes)
git commit -m "fix: handle empty file uploads correctly"
git commit -m "fix(api): return proper error for invalid project ID"

# Minor version bump (new features)
git commit -m "feat: add batch document processing"
git commit -m "feat(security): implement two-factor authentication"

# Major version bump (breaking changes)
git commit -m "feat!: change API response format for all endpoints"
git commit -m "feat: remove deprecated v1 endpoints

BREAKING CHANGE: v1 API endpoints have been removed"

# No version bump (documentation, refactoring, etc.)
git commit -m "docs: add API usage examples"
git commit -m "refactor: optimize database queries"
git commit -m "test: add integration tests for file upload"
git commit -m "style: format code with black"
```

### Workflow

1. Make your changes
2. Run tests: `uv run sero-test`
3. Commit with conventional format
4. Push to main branch
5. GitHub Actions will automatically:
   - Run tests
   - Bump version (if applicable)  
   - Generate changelog
   - Create GitHub release
   - Build and publish to PyPI (when configured)

### Development Commands

```bash
uv run sero-dev        # Start development server
uv run sero-test       # Run tests
uv run sero-test-cov   # Run tests with coverage
uv run sero-version    # Show current version
```
