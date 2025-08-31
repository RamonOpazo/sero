import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { encryptPasswordSecurely, isWebCryptoSupported } from '@/lib/crypto';
import { CredentialConfirmationDialog } from '@/components/shared/credential-confirmation-dialog';
import { useWorkspace } from '@/providers/workspace-provider';

interface TrustSecret {
  password: string,
  expiresAt: number,
}

interface ProjectTrustContextValue {
  ensureProjectTrust: (projectId: string) => Promise<{ keyId: string; encryptedPassword: string }>;
  isProjectTrusted: (projectId: string) => boolean;
  clearProjectTrust: (projectId?: string) => void;
}

const ProjectTrustContext = createContext<ProjectTrustContextValue | null>(null);

export function ProjectTrustProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef<Map<string, TrustSecret>>(new Map());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingProjectId = useRef<string | null>(null);
  const resolverRef = useRef<null | ((v: { keyId: string; encryptedPassword: string }) => void)>(null);
  const rejectRef = useRef<null | ((e: any) => void)>(null);

  const { state: workspace } = useWorkspace();

  const ensureProjectTrust = useCallback(async (projectId: string) => {
    const now = Date.now();
    const cached = cacheRef.current.get(projectId);
    if (cached && cached.expiresAt > now) {
      // Regenerate fresh encrypted credentials using cached password and fresh ephemeral key
      const encrypted = await encryptPasswordSecurely(cached.password);
      return { keyId: encrypted.keyId, encryptedPassword: encrypted.encryptedPassword };
    }

    if (!isWebCryptoSupported()) throw new Error('Web Crypto API not supported');

    return new Promise<{ keyId: string; encryptedPassword: string }>((resolve, reject) => {
      pendingProjectId.current = projectId;
      resolverRef.current = resolve;
      rejectRef.current = reject;
      setError(null);
      setDialogOpen(true);
    });
  }, []);

  const isProjectTrusted = useCallback((projectId: string) => {
    const now = Date.now();
    const cached = cacheRef.current.get(projectId);
    return !!cached && cached.expiresAt > now;
  }, []);

  const clearProjectTrust = useCallback((projectId?: string) => {
    if (!projectId) cacheRef.current.clear();
    else cacheRef.current.delete(projectId);
  }, []);

  const handleConfirm = useCallback(async (password: string) => {
    try {
      setIsEncrypting(true);
      const encrypted = await encryptPasswordSecurely(password);
      setIsEncrypting(false);
      setDialogOpen(false);
      const projectId = pendingProjectId.current!;
      // Extend trust period to 30 minutes regardless of ephemeral key TTL
      const TTL_MS = 30 * 60 * 1000;
      const secret: TrustSecret = {
        password,
        expiresAt: Date.now() + TTL_MS,
      };
      cacheRef.current.set(projectId, secret);
      resolverRef.current?.({ keyId: encrypted.keyId, encryptedPassword: encrypted.encryptedPassword });
    } catch (e) {
      setIsEncrypting(false);
      setError('Failed to encrypt password');
      rejectRef.current?.(e);
    } finally {
      pendingProjectId.current = null;
      resolverRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (resolverRef.current || rejectRef.current) {
      rejectRef.current?.(new Error('cancelled'));
      pendingProjectId.current = null;
      resolverRef.current = null;
      rejectRef.current = null;
    }
    setDialogOpen(false);
    setError(null);
  }, []);

  const value = useMemo<ProjectTrustContextValue>(() => ({ ensureProjectTrust, isProjectTrusted, clearProjectTrust }), [ensureProjectTrust, isProjectTrusted, clearProjectTrust]);

  const pendingProjectName = (() => {
    const pid = pendingProjectId.current;
    if (!pid) return null;
    const current = workspace.currentProject;
    if (current && current.id === pid) return current.name;
    return null;
  })();

  return (
    <ProjectTrustContext.Provider value={value}>
      {children}
      <CredentialConfirmationDialog
        isOpen={dialogOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        error={error}
        isLoading={isEncrypting}
        providerName={pendingProjectName}
      />
    </ProjectTrustContext.Provider>
  );
}

export function useProjectTrust() {
  const ctx = useContext(ProjectTrustContext);
  if (!ctx) throw new Error('useProjectTrust must be used within ProjectTrustProvider');
  return ctx;
}

