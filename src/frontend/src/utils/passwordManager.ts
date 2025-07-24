/**
 * Secure password management utility
 * Stores passwords temporarily in sessionStorage with document/file specific keys
 * Automatically cleans up when no longer needed
 */

const PASSWORD_PREFIX = 'sero_password_'
const PASSWORD_EXPIRY_PREFIX = 'sero_password_expiry_'
const DEFAULT_EXPIRY_MINUTES = 30

export interface PasswordEntry {
  password: string
  expiresAt: number
}

/**
 * Store a password for a specific document/file combination
 */
export function storePassword(documentId: string, fileId: string, password: string, expiryMinutes: number = DEFAULT_EXPIRY_MINUTES): void {
  const key = `${PASSWORD_PREFIX}${documentId}_${fileId}`
  const expiryKey = `${PASSWORD_EXPIRY_PREFIX}${documentId}_${fileId}`
  const expiresAt = Date.now() + (expiryMinutes * 60 * 1000)
  
  try {
    sessionStorage.setItem(key, password)
    sessionStorage.setItem(expiryKey, expiresAt.toString())
  } catch (error) {
    console.warn('Failed to store password in sessionStorage:', error)
  }
}

/**
 * Retrieve a password for a specific document/file combination
 * Returns null if password doesn't exist or has expired
 */
export function getPassword(documentId: string, fileId: string): string | null {
  const key = `${PASSWORD_PREFIX}${documentId}_${fileId}`
  const expiryKey = `${PASSWORD_EXPIRY_PREFIX}${documentId}_${fileId}`
  
  try {
    const password = sessionStorage.getItem(key)
    const expiryStr = sessionStorage.getItem(expiryKey)
    
    if (!password || !expiryStr) {
      return null
    }
    
    const expiresAt = parseInt(expiryStr, 10)
    if (Date.now() > expiresAt) {
      // Password has expired, clean it up
      clearPassword(documentId, fileId)
      return null
    }
    
    return password
  } catch (error) {
    console.warn('Failed to retrieve password from sessionStorage:', error)
    return null
  }
}

/**
 * Clear a specific password
 */
export function clearPassword(documentId: string, fileId: string): void {
  const key = `${PASSWORD_PREFIX}${documentId}_${fileId}`
  const expiryKey = `${PASSWORD_EXPIRY_PREFIX}${documentId}_${fileId}`
  
  try {
    sessionStorage.removeItem(key)
    sessionStorage.removeItem(expiryKey)
  } catch (error) {
    console.warn('Failed to clear password from sessionStorage:', error)
  }
}

/**
 * Clear all stored passwords (useful for logout or cleanup)
 */
export function clearAllPasswords(): void {
  try {
    const keys = Object.keys(sessionStorage)
    keys.forEach(key => {
      if (key.startsWith(PASSWORD_PREFIX) || key.startsWith(PASSWORD_EXPIRY_PREFIX)) {
        sessionStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('Failed to clear all passwords from sessionStorage:', error)
  }
}

/**
 * Clean up expired passwords
 */
export function cleanupExpiredPasswords(): void {
  try {
    const keys = Object.keys(sessionStorage)
    const now = Date.now()
    
    keys.forEach(key => {
      if (key.startsWith(PASSWORD_EXPIRY_PREFIX)) {
        const expiryStr = sessionStorage.getItem(key)
        if (expiryStr) {
          const expiresAt = parseInt(expiryStr, 10)
          if (now > expiresAt) {
            // Extract document and file IDs from the expiry key
            const suffix = key.replace(PASSWORD_EXPIRY_PREFIX, '')
            const [documentId, fileId] = suffix.split('_')
            if (documentId && fileId) {
              clearPassword(documentId, fileId)
            }
          }
        }
      }
    })
  } catch (error) {
    console.warn('Failed to cleanup expired passwords:', error)
  }
}

/**
 * Extend the expiry time for a password
 */
export function extendPasswordExpiry(documentId: string, fileId: string, additionalMinutes: number = DEFAULT_EXPIRY_MINUTES): boolean {
  const expiryKey = `${PASSWORD_EXPIRY_PREFIX}${documentId}_${fileId}`
  
  try {
    const expiryStr = sessionStorage.getItem(expiryKey)
    if (expiryStr) {
      const newExpiresAt = Date.now() + (additionalMinutes * 60 * 1000)
      sessionStorage.setItem(expiryKey, newExpiresAt.toString())
      return true
    }
  } catch (error) {
    console.warn('Failed to extend password expiry:', error)
  }
  
  return false
}
