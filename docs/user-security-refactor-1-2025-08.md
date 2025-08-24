Perfect ✅ — I’ll put together a **super detailed plan** for how your AI code companion (e.g. Copilot, Cursor, or my own workflow) can systematically refactor your project to support **multi-user authentication and asymmetric file encryption**, while ensuring **all hashes/keys are stored as `BLOB/bytes`** instead of `String`.

---

# 🔐 Detailed Refactor Plan for Your Project

---

## 1. **Schema Refactor**

### a. Add `users` table

* Store:

  * `username` (string, unique)
  * `password_hash` (BLOB) → Argon2id or bcrypt
  * `pubkey` (BLOB) → asymmetric public key
  * `privkey_encrypted` (BLOB) → private key encrypted with password
* Ensure **all security-sensitive values are `BLOB`**.

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4())
    created_at: Mapped[datetime] = mapped_column(AwareDateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(AwareDateTime, nullable=True)

    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[bytes] = mapped_column(BLOB, nullable=False)
    pubkey: Mapped[bytes] = mapped_column(BLOB, nullable=False)
    privkey_encrypted: Mapped[bytes] = mapped_column(BLOB, nullable=False)

    projects: Mapped[list["ProjectUser"]] = relationship("ProjectUser", back_populates="user")
```

---

### b. Create `project_users` table (many-to-many)

* Allows multiple users to belong to a project.
* Add `role` field for RBAC (admin, editor, viewer).

```python
class ProjectUser(Base):
    __tablename__ = "project_users"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4())
    user_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("users.id"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("projects.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="viewer")

    user: Mapped["User"] = relationship("User", back_populates="projects")
    project: Mapped["Project"] = relationship("Project", back_populates="users")
```

In `Project`:

```python
users: Mapped[list["ProjectUser"]] = relationship("ProjectUser", back_populates="project")
```

---

### c. Create `file_keys` table (per-user key wrapping)

* One row per `(file_id, user_id)`.
* Stores the **AES file key** encrypted with the user’s public key.

```python
class FileKey(Base):
    __tablename__ = "file_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, primary_key=True, default=lambda: uuid.uuid4())
    file_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("files.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUIDBytes, ForeignKey("users.id"), nullable=False)

    enc_file_key: Mapped[bytes] = mapped_column(BLOB, nullable=False)

    file: Mapped["File"] = relationship("File", back_populates="file_keys")
    user: Mapped["User"] = relationship("User")
```

In `File`:

```python
file_keys: Mapped[list["FileKey"]] = relationship("FileKey", back_populates="file", cascade="all, delete-orphan")
```

---

### d. Remove `Project.password_hash`

* That field was acting like "project as user."
* Authentication should only happen via `User`.

---

## 2. **Security Implementation Tasks**

### a. Passwords

* Use **Argon2id** (preferred) or bcrypt.
* Store output (`salt + hash`) as raw bytes → `BLOB`.

### b. Asymmetric crypto

* Generate per-user RSA-4096 or X25519 keypair.
* Store:

  * `pubkey` (BLOB, cleartext)
  * `privkey_encrypted` (BLOB, AES-GCM with key derived from password)

### c. File encryption

* On upload:

  1. Generate random AES-256 key `K` for file.
  2. Encrypt file bytes with AES-GCM → store in `files.data`.
  3. For each authorized user:

     * Encrypt `K` with user’s pubkey → store in `file_keys.enc_file_key`.

* On access:

  1. User logs in → derives AES key from password → decrypts `privkey_encrypted`.
  2. Load `file_keys.enc_file_key` for `(file, user)`.
  3. Decrypt → `K`.
  4. Use `K` to decrypt file data.

---

## 3. **Migration Strategy**

1. Create new tables (`users`, `project_users`, `file_keys`).
2. Remove `projects.password_hash`.
3. Migrate existing projects:

   * Option A: Auto-create a `User` for each project (using project’s `password_hash` as initial user password).
   * Option B: Require users to sign up fresh (cleaner).
4. Add DB constraints:

   * `UniqueConstraint("username")` on users.
   * `(file_id, user_id)` unique in `file_keys`.
   * `(project_id, user_id)` unique in `project_users`.

---

## 4. **Code Companion (AI Assistant) Task Breakdown**

When guiding your AI:

1. **Generate new models**

   * Insert `User`, `ProjectUser`, `FileKey` into `models.py`.
   * Replace `Project.password_hash` with `Project.users` relationship.

2. **Update services layer**

   * Add `auth.py` with:

     * `hash_password(password: str) -> bytes`
     * `verify_password(password: str, stored_hash: bytes) -> bool`
     * `generate_keypair(password: str) -> (pub: bytes, priv_enc: bytes)`
     * `decrypt_privkey(priv_enc: bytes, password: str) -> priv: bytes`
   * Add `crypto.py` with:

     * `encrypt_file(data: bytes) -> (ciphertext: bytes, key: bytes)`
     * `decrypt_file(ciphertext: bytes, key: bytes) -> bytes`
     * `wrap_key(key: bytes, pubkey: bytes) -> bytes`
     * `unwrap_key(enc_key: bytes, privkey: bytes) -> bytes`

3. **Update file upload API**

   * When uploading:

     * Encrypt file.
     * Store AES key wrapped for all project users.

4. **Update file download API**

   * Authenticate user.
   * Decrypt their private key with password.
   * Unwrap AES key.
   * Decrypt file.

5. **Write migration script**

   * Create tables.
   * Drop `Project.password_hash`.

---

## 5. **Future Considerations**

* Add audit logs (`who downloaded what, when`).
* Support key rotation (generate new file keys without re-encrypting files).
* Add JWT-based session auth (instead of storing password in memory).
* Enforce role-based access (`project_users.role`).

---

⚡ Summary:
Yes, all **hashes/keys/salts should be stored as `BLOB`** (not `String`).
The main structural changes are introducing **users, project\_users, and file\_keys**.
The AI code companion can do this in **staged PRs**: schema → crypto utils → services → API → migration.

---

Do you want me to **draft the exact SQLAlchemy models (fully integrated into your code)** with `User`, `ProjectUser`, `FileKey` added, so you can drop them into your `models.py`?
