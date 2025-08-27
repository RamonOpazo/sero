# Security in SERO

Security is not an afterthought in SERO; it is the foundational principle upon which the entire system is built. Our primary goal is to ensure that sensitive documents are protected with strong, modern cryptography at every stage of their lifecycle. This document provides a comprehensive overview of SERO's security architecture, from project creation to document processing.

## The Core Principle: The Project as a Sealed Box

The most important security concept in SERO is the **project**. A project is not just a folder for your documents; it is a completely isolated, encrypted vault. Every piece of data and every file uploaded to a project is encrypted with a unique key that is derived from that project's password.

This "sealed box" model ensures that data from one project is cryptographically separated from all others. Even if an attacker were to gain access to the server's raw storage, the encrypted contents of your projects would be indistinguishable from random noise without the correct passwords.

## The Project Password: Your Master Key

Everything starts with the project password. When you create a project, you provide a password that SERO uses as the master key for your encrypted vault.

Here’s how it works:

1.  **It Never Leaves the Client in Plaintext (for most operations):** For operations that don't require decryption (like logging in or verifying ownership), your password is not sent to the server.
2.  **It is Never Stored by the Server:** We **never** store your plaintext password on our servers. When you create a project, we generate a secure hash of your password using `passlib` with the `pbkdf2_sha256` algorithm. This hash is stored and used only to verify your password when you need to perform a sensitive action.
3.  **It Derives the Encryption Key:** This is the most critical step. The security of your project's data relies on turning your memorable password into a strong, 256-bit cryptographic key. We use a standard, highly-regarded Key Derivation Function (KDF) called **PBKDF2**. This function takes your password, combines it with a unique salt (a random value stored with your project), and runs it through tens of thousands of hashing rounds. The result is a powerful encryption key that cannot be easily guessed or reverse-engineered.

Because the password is so crucial, it is vital that you choose a strong, unique passphrase for every project. **If you lose the project password, you lose access to the data forever.** There is no recovery mechanism, by design.

## Encryption in Detail

SERO protects your data in its three possible states: at rest, in transit, and in use.

### Data at Rest: Encrypted on Disk

When you upload a document to a SERO project, it is immediately encrypted before being saved to the server's disk.

-   **Algorithm:** We use the **Fernet** authenticated cryptography scheme from Python's `cryptography` library.
-   **Details:** Fernet guarantees both confidentiality and authenticity. It uses AES-128 in CBC mode for encryption and a SHA256 HMAC for authentication. This means that not only is your data unreadable without the key, but it is also protected from being tampered with or modified.
-   **Key Management:** The encryption key used is the one derived from your project password via PBKDF2. Each project has its own unique key, ensuring strict data isolation.

### Data in Transit: Secured via TLS

All communication between your browser (the SERO frontend) and the SERO backend server is secured using **Transport Layer Security (TLS)**, also known as HTTPS. This is the same encryption protocol that protects online banking and e-commerce.

TLS ensures that any data you send, including your project password when it's needed for decryption, is encrypted while it travels over the network. This prevents eavesdroppers or "man-in-the-middle" attackers from intercepting your credentials or data.

### Data in Use: Transient Decryption

Data is only ever decrypted in the server's memory at the exact moment it is needed for an operation, such as displaying a page preview or performing redaction. This is a "just-in-time" decryption model.

-   To perform any action that requires viewing document content, you must provide the project password.
-   The server uses the password to derive the key in memory, decrypts the data, performs the requested operation, and then discards the decrypted data.
-   The plaintext content of your documents is never held in memory longer than is absolutely necessary.

## API and Authentication

The SERO API is designed with security in mind.

-   **Password Verification:** The API provides a secure endpoint (`/api/security/password/verify`) that allows the frontend to check a password against the stored hash without exposing the hash itself.
-   **CORS Policy:** The backend enforces a strict Cross-Origin Resource Sharing (CORS) policy, ensuring that only trusted web frontends can interact with the API. This helps prevent certain types of web-based attacks.

## Security Best Practices

While SERO provides a secure foundation, the overall security of your data also depends on how you use the system.

-   **Use Strong, Unique Passwords:** Your project password is the key to your vault. Use a long, complex, and unique passphrase for each project.
-   **Protect Your Credentials:** Do not share project passwords over insecure channels like email or chat.
-   **Be Mindful of Your Connection:** Ensure you are always connected to SERO over a secure HTTPS connection (look for the lock icon in your browser's address bar).

By understanding these principles, you can be confident that your sensitive information is well-protected within the SERO ecosystem.