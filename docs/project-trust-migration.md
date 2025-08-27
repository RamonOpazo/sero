# Project Trust Migration Plan

Status: Draft
Owner: Frontend Team
Date: 2025-08-27
Related: docs/project-trust-session.md

Objective
- Replace all ad hoc/legacy password prompting with the new ProjectTrustProvider flow.
- Ensure all sensitive actions use encrypted credentials ({ key_id, encrypted_password }) derived by Web Crypto.
- Remove plaintext password handling and UI where possible.

Non‑goals (for this phase)
- Backend changes beyond endpoints already accepting key_id/encrypted_password.
- Reworking project creation (it may still accept plaintext password for hashing on the server, unless decided otherwise).
- Changing document upload contract (can be addressed in a follow-up phase).

Background
See docs/project-trust-session.md for policy. In short: establish an in-memory, TTL-scoped project trust session, prompt via CredentialConfirmationDialog, encrypt locally using crypto.ts (ephemeral RSA), and forward only encrypted material to the backend.

Scope of this migration (Phase 1)
- Document viewing (original files) uses ensureProjectTrust before fetching the original file.
- Document processing (redaction) uses ensureProjectTrust before initiating processing.
- Remove legacy DocumentPasswordDialog and any direct password collection for these flows.

Impacted areas
- src/frontend/src/views/editor-view/use-editor-view.ts
- src/frontend/src/views/editor-view/editor-view.tsx
- src/frontend/src/components/features/document-viewer/components/tooldeck/document-controls.tsx
- src/frontend/src/views/editor-view/dialogs/document-password-dialog.tsx (remove)
- src/frontend/src/views/editor-view/dialogs/index.ts (remove)
- src/frontend/src/lib/editor-api.ts (add loadOriginalFileEncrypted)
- src/frontend/src/lib/documents-api.ts (add processDocumentEncrypted)
- Providers already exist: src/frontend/src/providers/project-trust-provider.tsx

Detailed changes
1) Editor API
   - Add EditorAPI.loadOriginalFileEncrypted(documentId, { keyId, encryptedPassword }) that downloads the original file using encrypted credentials. No plaintext password parameter.

2) Documents API
   - Add DocumentsAPI.processDocumentEncrypted(documentId, { keyId, encryptedPassword }) that triggers processing using encrypted credentials. Avoids collecting password in the component.

3) Editor View
   - Replace password dialog flow with trust flow:
     - When fileType === 'original' and metadata loaded, call ensureProjectTrust(project_id). If trusted, call EditorAPI.loadOriginalFileEncrypted().
     - Provide a retry action that re-invokes ensureProjectTrust on demand.
   - Remove DocumentPasswordDialog import and state.

4) Document Controls (Process Document)
   - On click, call ensureProjectTrust(project_id). If trusted, call DocumentsAPI.processDocumentEncrypted().
   - Remove dialog that collects password.

5) Remove legacy components/exports
   - Delete DocumentPasswordDialog and its index export.

Open items for Phase 2
- Bulk upload: move from plaintext 'password' form field to { key_id, encrypted_password } or trust-session reuse. Requires backend contract update.
- Project creation: optionally encrypt password-in-transit (frontend) while backend still hashes; requires backend contract update.
- Global lock/unlock UI; idle auto-lock timer; settings integration.

Testing plan
- Unit: EditorAPI and DocumentsAPI additions.
- Integration (manual):
  - Open original viewer for a document in a project → prompt once → file loads. Subsequent actions within TTL do not prompt.
  - Run AI processing from Document Controls → prompts once if not already trusted → succeeds.
  - Run project-level AI from Projects table → should already work with ProjectTrustProvider.

Acceptance criteria
- No remaining imports/usages of DocumentPasswordDialog.
- Viewing original files and processing documents work through ProjectTrustProvider without plaintext passwords.
- Trust cache TTL respected; re-prompt after expiry.

Rollback
- Revert to previous commit. Legacy DocumentPasswordDialog component can be restored if necessary.

---

Task breakdown and status (Phase 1)

- [x] Documentation: migration plan created (this document)
- [x] EditorAPI: add loadOriginalFileEncrypted(documentId, { keyId, encryptedPassword })
- [x] DocumentsAPI: add processDocumentEncrypted(documentId, { keyId, encryptedPassword })
- [x] use-editor-view.ts: migrate to trust flow (ensureProjectTrust → loadOriginalFileEncrypted); remove password dialog state/handlers; add retryUnlock
- [x] editor-view.tsx: remove DocumentPasswordDialog; wire retry button to unlock action
- [ ] document-controls.tsx: migrate Process action to trust flow; remove password dialog
- [ ] Remove legacy files: dialogs/document-password-dialog.tsx and dialogs/index.ts
- [ ] Sweep codebase for legacy references (DocumentPasswordDialog, passwordDialog, onRetryPassword, onOpenPasswordDialog)

Phase 2 (tracked, not started)

- [ ] Bulk upload: switch plaintext password to { key_id, encrypted_password } (frontend + backend)
- [ ] Project creation: optionally encrypt password-in-transit (frontend + backend)
- [ ] Settings: lock/clear trust, TTL controls, and idle auto-lock

