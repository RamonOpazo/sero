# Project Trust Session Policy

Status: Implemented (frontend)
Author: Agent Mode
Date: 2025-08-27

Summary
- Users must establish a Project Trust Session ("unlock project") before performing sensitive actions within a project.
- Trust is session-scoped, in-memory only, and expires automatically after a short TTL.
- No plaintext secrets are stored or logged; the password is encrypted locally and only encrypted material is cached.

Scope and gated actions
- Scope: per project (projectId)
- Examples of gated actions:
  - Viewing or downloading original files
  - Running AI processing (document-level and project-level)
  - Export operations or other sensitive mutations

Trust establishment flow
1) When a gated action is initiated, the frontend calls ensureProjectTrust(projectId).
2) If a valid, non-expired trust token exists, continue immediately.
3) Otherwise, show the CredentialConfirmationDialog ("Unlock project").
4) On confirm, the password is encrypted locally (Web Crypto) producing { keyId, encryptedPassword }.
5) An in-memory token entry is cached for the project with a TTL (default: 30 minutes).
6) Sensitive requests include { key_id, encrypted_password } if the backend endpoint requires server-side verification.

Security posture
- Session-only, in-memory cache with TTL; no localStorage or persistent storage.
- No plaintext secrets are stored or logged by the frontend.
- Optional idle auto-lock can be introduced to reduce exposure window further.
- Clear trust: users can explicitly lock a project or clear all trust sessions via settings.

Frontend implementation
- Provider: ProjectTrustProvider
  - ensureProjectTrust(projectId): Promise<{ keyId, encryptedPassword }>
  - isProjectTrusted(projectId): boolean
  - clearProjectTrust(projectId?): void
- UI: CredentialConfirmationDialog (shared styling) for the password prompt.
- Integration points:
  - Projects table action "Run AI (project)" calls ensureProjectTrust before streaming.
  - Document prompt commander calls ensureProjectTrust(document.project_id) before streaming.
  - Future: document viewer for original files and exports should call ensureProjectTrust.

Backend integration (optional, recommended)
- For endpoints that require elevated access, accept { key_id, encrypted_password } and validate server-side.
- Return 401/403 for missing or invalid trust tokens.
- This complements the frontend gate with defense-in-depth.

Configuration knobs
- TTL (default: 30 minutes)
- Optional idle auto-lock interval (e.g., 10 minutes of inactivity)
- Optional project pre-unlock action in the UI to establish trust ahead of time

Operational guidance
- Add a settings control to lock all projects (clears trust cache).
- Consider lightweight telemetry (no secret material) on unlock/lock events for audit visibility.

Future enhancements
- Per-action override to enforce one-time prompt (no caching) for ultra-sensitive operations.
- Visual affordance indicating project is unlocked with a clear “Lock” control.
- Centralized guard higher in the route tree to prevent scattered trust checks in components.

