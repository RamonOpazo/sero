# Database Refactor Migration Plan (2025-08)

This document describes the planned database schema refactor for Sero backend, along with data migration steps and rollout strategy. The goal is to streamline workflow by introducing explicit project-scoped settings, scoping and state for prompts and selections, and a dedicated template table. Tags are removed from documents.

Status: PLANNED
Branch: feat/db-refactor-scoped-settings

## Summary of Changes

- Project-scoped settings (one-to-one and mandatory):
  - ai_setting (required)
  - watermark_setting (required)
  - annotation_setting (required)
- Prompts and selections gain explicit state and remain document-scoped:
  - scope: DOCUMENT (for both)
  - state: STAGED (default) or COMMITTED
- Prompts and selections require document_id (no project-level scoping).
- Enabled flag removed in favor of state (prompts).
- Dedicated template table with unique(project_id) ensuring one template per project.
- Remove Document.tags.

## Current vs Target Schema (High-Level)

- Project
  - Keep fields: id, created_at, updated_at, name (unique), description, contact_name, contact_email, password_hash
  - New one-to-one relationships: ai_setting, watermark_setting, annotation_setting
- Document
  - Keep: id, timestamps, name, description, project_id
  - Remove: tags
  - Optional one-to-one ai_setting is NOT used (settings are project-only now)
- File
  - No structural changes
- Selection
  - Add: scope (DOCUMENT), state (STAGED|COMMITTED default STAGED)
  - page_number nullable implies global
  - Remove: committed (replaced by state)
- Prompt
  - Keep: title, directive, prompt (content)
  - Add: scope (DOCUMENT), state (STAGED|COMMITTED default STAGED)
  - Remove: enabled
- Settings (new tables, required, one-to-one with Project)
  - ai_setting: provider, model_name, temperature, top_p NULL, max_tokens NULL, num_ctx NULL, seed NULL, stop_tokens, system_prompt, project_id FK
  - watermark_setting: anchor, padding, bg_color NULL, fg_color, text, text_size, project_id FK
  - annotation_setting: bg_color, fg_color NULL, text NULL, text_size NULL, project_id FK
- Template (new)
  - id, timestamps, project_id FK, document_id FK, unique(project_id)

## Enum Changes

- New enums:
  - ScopeType: DOCUMENT
  - CommitState: STAGED, COMMITTED
  - AnchorOption: NW, NE, SE, SW, ZH
- FileType unchanged

## Migration Strategy

Given SQLite without alembic migrations, we will use an in-app migration routine guarded by a feature flag or version check. Steps are designed to be idempotent.

### 0. Pre-checks
- Backup: copy the current SQLite file to /tmp/sero.pre-refactor.{timestamp}.sqlite
- Ensure WAL checkpoint and integrity check

### 1. New tables
- Create tables: ai_settings (project-scoped), watermark_settings, annotation_settings, templates
- Add unique index on templates.project_id
- Add unique index on each settings table project_id

### 2. Selections: add scope/state (document-only)
- Add columns: scope TEXT NOT NULL DEFAULT 'DOCUMENT', state TEXT NOT NULL DEFAULT 'STAGED'
- Migrate data:
  - Set state='COMMITTED' where committed=1, else 'STAGED'
- Drop column committed after successful data backfill

### 3. Prompts: scope/state and enabled removal
- Add columns: scope TEXT NOT NULL DEFAULT 'DOCUMENT', state TEXT NOT NULL DEFAULT 'STAGED'
- Backfill: state='COMMITTED' where enabled=1, else 'STAGED'
- Drop column enabled

### 4. Documents: drop tags
- If column exists, drop tags
- No data transformation required

### 5. Project-scoped settings with defaults
- For each existing project, insert one ai_setting, one watermark_setting, one annotation_setting with sensible defaults derived from application config
- Enforce unique(project_id) for each settings table

### 6. Template table
- Create table templates with project_id and document_id (FKs)
- Add unique(project_id)
- Optional backfill: none by default; can be later designated by user workflows

### 7. Code paths and compatibility
- Update ORM models, Pydantic schemas, and CRUD/controllers to reflect new fields and relationships
- Adjust service logic to read settings from project tables
- Maintain compatibility of existing APIs where possible; add filters for scope and state selections/prompts

### 8. Validation and Tests
- Run full test suite: uv run sero-test
- Fix failing tests iteratively

### 9. Rollback Plan
- Stop the app
- Restore the pre-refactor DB from /tmp/sero.pre-refactor.{timestamp}.sqlite to the configured DB path
- Revert the code branch or switch back to main

## SQL Sketches (SQLite)

Note: Actual DDL will be implemented via SQLAlchemy models metadata create_all and/or controlled migration scripts. Below is a guideline.

- Selections
  - ALTER TABLE selections ADD COLUMN scope TEXT NOT NULL DEFAULT 'DOCUMENT';
  - ALTER TABLE selections ADD COLUMN state TEXT NOT NULL DEFAULT 'STAGED';
  - UPDATE selections SET state='COMMITTED' WHERE committed=1;
  - -- After code updates and data checks:
  - -- ALTER TABLE selections DROP COLUMN committed; -- SQLite requires table rebuild

- Prompts
  - ALTER TABLE prompts ADD COLUMN scope TEXT NOT NULL DEFAULT 'DOCUMENT';
  - ALTER TABLE prompts ADD COLUMN state TEXT NOT NULL DEFAULT 'STAGED';
  - UPDATE prompts SET state='COMMITTED' WHERE enabled=1;
  - -- ALTER TABLE prompts DROP COLUMN enabled; -- via table rebuild

- Documents
  - -- ALTER TABLE documents DROP COLUMN tags; -- via table rebuild

- Settings
  - CREATE TABLE ai_settings_project (..., project_id BLOB NOT NULL UNIQUE, ...);
  - CREATE TABLE watermark_settings (..., project_id BLOB NOT NULL UNIQUE, ...);
  - CREATE TABLE annotation_settings (..., project_id BLOB NOT NULL UNIQUE, ...);

- Template
  - CREATE TABLE templates (..., project_id BLOB NOT NULL UNIQUE, document_id BLOB NOT NULL, ...);

## Application Defaults

- ai_setting: provider=ollama, model_name=from config, temperature=0.2, top_p=NULL, max_tokens=NULL, num_ctx=NULL, seed=NULL, stop_tokens=[], system_prompt=NULL
- watermark_setting: anchor=NW, padding=8, fg_color='#ff0000', bg_color=NULL, text='Redacted with SERO – MIT Licensed', text_size=12
- annotation_setting: bg_color='#000000', fg_color=NULL, text=NULL, text_size=NULL

## Open Questions (resolved)
- Settings scope: Project-only, mandatory one-to-one
- Templates: Dedicated table with unique(project_id)
- Prompts: Keep prompt content; add scope/state; remove enabled
- Selections: Add scope/state; page_number nullable means global; document-only (document_id required)
- Tags: Removed

## Operational Notes

- Because SQLite lacks robust ALTER capabilities, structural drops (committed/enabled/tags) will be done using a table rebuild pattern handled by SQLAlchemy metadata migrations or dedicated migration logic.
- Ensure foreign_keys=ON PRAGMA remains enabled; constraints should be enforced.
- Perform migrations on application startup behind a version gate to avoid repeated work; log idempotency.

