/**
 * RSA Encryption Utilities for Secure Password Transmission
 * 
 * This module provides client-side RSA encryption using the Web Crypto API
 * to securely encrypt passwords before sending them to the backend.
 * 
 * Security Features:
 * - Uses ephemeral RSA keys (generated per request)
 * - OAEP padding with SHA-256
 * - Perfect forward secrecy
 * - No password storage or caching
 */

export interface EphemeralKeyResponse {
  key_id: string;
  public_key: string;
  expires_in_seconds: number;
  algorithm: string;
  padding: string;
}

export interface EncryptedPassword {
  keyId: string,
  encryptedPassword: string, // Base64 encoded
  expiresInSeconds: number,
}

/**
 * Fetches a fresh ephemeral RSA public key from the backend
 */
export async function getEphemeralPublicKey(): Promise<EphemeralKeyResponse> {
  console.log('🔐 Requesting ephemeral RSA public key...');
  
  const response = await fetch('/api/security/ephemeral-key');
  
  if (!response.ok) {
    throw new Error(`Failed to get ephemeral key: ${response.status} ${response.statusText}`);
  }
  
  const keyData = await response.json();
  console.log(`✅ Received ephemeral key: ${keyData.key_id} (expires in ${keyData.expires_in_seconds}s)`);
  
  return keyData;
}

/**
 * Imports a PEM-formatted RSA public key into Web Crypto API format
 */
export async function importRSAPublicKey(pemKey: string): Promise<CryptoKey> {
  // Remove PEM header/footer and decode base64
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pemKey
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  // Decode base64 to binary
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    "spki", // SubjectPublicKeyInfo format
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false, // not extractable
    ["encrypt"]
  );
  
  console.log('✅ RSA public key imported successfully');
  return cryptoKey;
}

/**
 * Encrypts a password using RSA-OAEP with the provided public key
 */
export async function encryptPasswordWithRSA(
  password: string, 
  publicKey: CryptoKey
): Promise<string> {
  console.log('🔐 Encrypting password with RSA-OAEP...');
  
  // Convert password to bytes
  const passwordBytes = new TextEncoder().encode(password);
  
  // Encrypt using RSA-OAEP
  const encryptedBytes = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    publicKey,
    passwordBytes
  );
  
  // Convert to base64
  const encryptedBase64 = btoa(
    String.fromCharCode(...new Uint8Array(encryptedBytes))
  );
  
  console.log(`✅ Password encrypted (${encryptedBase64.length} chars)`);
  return encryptedBase64;
}

/**
 * Complete workflow: Get ephemeral key and encrypt password
 * This is the main function to use for secure password encryption
 */
export async function encryptPasswordSecurely(password: string): Promise<EncryptedPassword> {
  console.log('🚀 Starting secure password encryption workflow...');
  
  try {
    // Step 1: Get ephemeral public key from backend
    const keyData = await getEphemeralPublicKey();
    
    // Step 2: Import the public key
    const publicKey = await importRSAPublicKey(keyData.public_key);
    
    // Step 3: Encrypt the password
    const encryptedPassword = await encryptPasswordWithRSA(password, publicKey);
    
    console.log('✅ Password encryption workflow completed successfully');
    
    return {
      keyId: keyData.key_id,
      encryptedPassword: encryptedPassword,
      expiresInSeconds: Number(keyData.expires_in_seconds) || 0,
    };
    
  } catch (error) {
    console.error('❌ Password encryption workflow failed:', error);
    throw new Error(`Failed to encrypt password securely: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if the current browser supports the required Web Crypto API features
 */
export function isWebCryptoSupported(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.importKey === 'function' &&
    typeof crypto.subtle.encrypt === 'function'
  );
}

/**
 * Get crypto statistics for debugging/monitoring
 */
export async function getCryptoStats(): Promise<any> {
  const response = await fetch('/api/security/stats');
  if (!response.ok) {
    throw new Error(`Failed to get crypto stats: ${response.status}`);
  }
  return response.json();
}
