import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { encryptPasswordSecurely, isWebCryptoSupported } from '@/lib/crypto';
import { CredentialConfirmationDialog } from '@/components/shared/credential-confirmation-dialog';

interface EncryptedCreds {
  keyId: string;
  encryptedPassword: string;
  expiresAt: number; // epoch ms
}

interface AiCredentialsContextValue {
  ensureCredentials: (providerName: string) => Promise<{ keyId: string; encryptedPassword: string }>;
  clearCredentials: (providerName?: string) => void;
}

const AiCredentialsContext = createContext<AiCredentialsContextValue | null>(null);

const TTL_MS = 15 * 60 * 1000; // 15 minutes

export function AiCredentialsProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef<Map<string, EncryptedCreds>>(new Map());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingProvider = useRef<string | null>(null);
  const resolverRef = useRef<null | ((v: { keyId: string; encryptedPassword: string }) => void)>(null);
  const rejectRef = useRef<null | ((e: any) => void)>(null);

  const ensureCredentials = useCallback(async (providerName: string) => {
    // Check cache first
    const now = Date.now();
    const cached = cacheRef.current.get(providerName);
    if (cached && cached.expiresAt > now) {
      return { keyId: cached.keyId, encryptedPassword: cached.encryptedPassword };
    }

    // Need to prompt
    if (!isWebCryptoSupported()) {
      throw new Error('Web Crypto API not supported');
    }

    return new Promise<{ keyId: string; encryptedPassword: string }>((resolve, reject) => {
      pendingProvider.current = providerName;
      resolverRef.current = resolve;
      rejectRef.current = reject;
      setError(null);
      setDialogOpen(true);
    });
  }, []);

  const clearCredentials = useCallback((providerName?: string) => {
    if (!providerName) {
      cacheRef.current.clear();
    } else {
      cacheRef.current.delete(providerName);
    }
  }, []);

  const handleConfirm = useCallback(async (password: string) => {
    try {
      setIsEncrypting(true);
      const encrypted = await encryptPasswordSecurely(password);
      setIsEncrypting(false);
      setDialogOpen(false);
      const providerName = pendingProvider.current!;
      const creds: EncryptedCreds = {
        keyId: encrypted.keyId,
        encryptedPassword: encrypted.encryptedPassword,
        expiresAt: Date.now() + TTL_MS,
      };
      cacheRef.current.set(providerName, creds);
      resolverRef.current?.({ keyId: creds.keyId, encryptedPassword: creds.encryptedPassword });
    } catch (e) {
      setIsEncrypting(false);
      setError('Failed to encrypt password');
      rejectRef.current?.(e);
    } finally {
      pendingProvider.current = null;
      resolverRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    // If user cancels the dialog, reject the promise if pending
    if (resolverRef.current || rejectRef.current) {
      rejectRef.current?.(new Error('cancelled'));
      pendingProvider.current = null;
      resolverRef.current = null;
      rejectRef.current = null;
    }
    setDialogOpen(false);
    setError(null);
  }, []);

  const value = useMemo<AiCredentialsContextValue>(() => ({ ensureCredentials, clearCredentials }), [ensureCredentials, clearCredentials]);

  return (
    <AiCredentialsContext.Provider value={value}>
      {children}
      <CredentialConfirmationDialog
        isOpen={dialogOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        error={error}
        isLoading={isEncrypting}
        providerName={pendingProvider.current}
      />
    </AiCredentialsContext.Provider>
  );
}

export function useAiCredentials() {
  const ctx = useContext(AiCredentialsContext);
  if (!ctx) throw new Error('useAiCredentials must be used within AiCredentialsProvider');
  return ctx;
}

