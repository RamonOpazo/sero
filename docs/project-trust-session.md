# Project Trust Session Policy

Status: Implemented (frontend)
Author: Agent Mode
Date: 2025-08-27

Summary
- Users must establish a Project Trust Session ("unlock project") before performing sensitive actions within a project.
- Trust is session-scoped, in-memory only, and expires automatically after a short TTL.
- No plaintext secrets are stored or logged; the password is encrypted locally and only encrypted material is cached.
- Ephemeral credentials are regenerated per request: the password is kept in memory (TTL) and re-encrypted with a fresh ephemeral public key for each gated operation. No key reuse.

Scope and gated actions
- Scope: per project (projectId)
- Examples of gated actions:
  - Viewing or downloading original files
  - Running AI processing (document-level and project-level)
  - Export operations or other sensitive mutations

Trust establishment flow
1) When a gated action is initiated, the frontend calls ensureProjectTrust(projectId).
2) If a valid, non-expired trust entry exists, the client fetches a fresh ephemeral RSA key from the backend and re-encrypts the cached password to produce a new pair { keyId, encryptedPassword } for this request.
3) Otherwise, show the CredentialConfirmationDialog ("Unlock project").
4) On confirm, the password is encrypted locally (Web Crypto) to serve the initial request, and the plaintext password is stored in-memory only with a short TTL.
5) The in-memory entry tracks only the plaintext password and its expiry (aligned to the server’s ephemeral key TTL minus a safety margin). No persistent storage.
6) Sensitive requests include { key_id, encrypted_password } generated freshly per request.

Security posture
- Session-only, in-memory cache with TTL; no localStorage or persistent storage.
- The plaintext password is stored in-memory only for the TTL window to enable per-request re-encryption; never persisted or logged.
- Optional idle auto-lock can be introduced to reduce exposure window further.
- Clear trust: users can explicitly lock a project or clear all trust sessions via settings.

Frontend implementation
- Provider: ProjectTrustProvider
  - ensureProjectTrust(projectId): returns a freshly generated { keyId, encryptedPassword } each time (re-encrypts with new server ephemeral key if in-memory trust exists)
  - isProjectTrusted(projectId): boolean
  - clearProjectTrust(projectId?): void
- Provider: AiCredentialsProvider (for AI actions) mirrors the same behavior
- UI: CredentialConfirmationDialog (shared styling) for the password prompt.
- Integration points:
  - Projects table action "Run AI (project)" calls ensureProjectTrust before streaming.
  - Document prompt commander calls ensureProjectTrust(document.project_id) before streaming.
  - Future: document viewer for original files and exports should call ensureProjectTrust.

Backend integration (optional, recommended)
- For endpoints that require elevated access, accept { key_id, encrypted_password } and validate server-side.
- Treat each ephemeral key pair as single-use; reject reused key IDs with 400/401.
- Return 401/403 for missing or invalid trust tokens.
- This complements the frontend gate with defense-in-depth.

Configuration knobs
- Trust TTL: aligned to server’s ephemeral key TTL (expires_in_seconds) minus a safety margin (currently 5s)
- Optional idle auto-lock interval (e.g., 10 minutes of inactivity)
- Optional project pre-unlock action in the UI to establish trust ahead of time

Operational guidance
- Add a settings control to lock all projects (clears trust cache).
- Consider lightweight telemetry (no secret material) on unlock/lock events for audit visibility.

Future enhancements
- Per-action override to enforce one-time prompt (no caching) for ultra-sensitive operations.
- Visual affordance indicating project is unlocked with a clear “Lock” control.
- Centralized guard higher in the route tree to prevent scattered trust checks in components.

