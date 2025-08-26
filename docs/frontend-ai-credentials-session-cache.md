# Frontend AI Credentials Session Cache

Status: Proposed and implemented (session-only)
Scope: Frontend only (no backend schema changes)
Author: Agent Mode
Date: 2025-08-26

Overview
- Problem: Users must re-enter provider credentials (password) for each AI run (document or project).
- Goal: Avoid repeated prompts while keeping credentials secure and never storing plaintext.
- Solution: A session-scoped, in-memory cache of encrypted credentials keyed by provider name, with a short TTL. No persistence to disk/localStorage. Plaintext never leaves the dialog; only encryptedPassword and keyId are cached.

Threat model and security posture
- We do not persist plaintext or encrypted credentials to storage. Cache exists only in-memory for the current tab session.
- We never log credentials, keyId, or ciphertext.
- TTL (default 15 minutes) reduces exposure window if a user leaves the tab unattended.
- Cache is invalidated on Cancel (optional) and can be cleared on logout or page reload (implicit).
- Multiple providers: cache is keyed by provider name; different providers get separate entries.
- Different models under the same provider reuse the same credential entry by default.

Data stored in cache (per provider)
- keyId: string (identifier for the ephemeral encryption key / server key ref)
- encryptedPassword: string (ciphertext, never plaintext)
- expiresAt: number (epoch ms)

User flow
1) When starting an AI run (document or project), the frontend determines the provider name (e.g., from project AI settings or explicit selection).
2) The frontend calls ensureCredentials(providerName):
   - If a valid, non-expired cache entry exists, return it immediately.
   - Otherwise, open a password dialog. On confirm, run encryptPasswordSecurely(password) to produce { keyId, encryptedPassword } and store with TTL.
3) The encrypted pair is passed to streaming endpoints as { key_id, encrypted_password }.
4) Cancel or complete does not clear the cache by default, so repeated runs within the TTL skip prompts.

Developer integration
- New provider: AiCredentialsProvider exposing ensureCredentials(providerName: string) => Promise<{keyId, encryptedPassword}>.
- Uses existing DocumentPasswordDialog for UX.
- Project run action updated to fetch project AI settings, call ensureCredentials, then start streaming with { keyId, encryptedPassword }.

Migration notes
- No backend changes required if the server already accepts { key_id, encrypted_password }.
- For document runs, you may gradually adopt ensureCredentials() to centralize the flow and share the cache.
- Consider adding a global "Clear credentials" action if needed by admins.

Config knobs (front-end constants)
- TTL_MS: default 15 minutes.

Future enhancements
- Scope cache by provider+endpoint if different backends require distinct secrets.
- Optionally tie cache to workspace/project for even finer control.
- Obfuscate dialog affordances when using a hardware-backed key or WebAuthn (if adopted later).

