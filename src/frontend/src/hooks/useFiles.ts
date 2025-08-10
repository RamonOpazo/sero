import { useState, useCallback } from "react";
import { toast } from 'sonner'
import type { FileType, PromptType, SelectionType } from '@/types'
import { AsyncResultWrapper, type Result } from '@/lib/result'
import { api } from "@/lib/axios"
import { encryptPasswordSecurely, isWebCryptoSupported } from '@/lib/crypto'

export interface FileWithRelatedData {
  file: FileType;
  blob: Blob;
  prompts: PromptType[];
  selections: SelectionType[];
}

export function useFiles() {
  const [currentFileData, setCurrentFileData] = useState<FileWithRelatedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const loadFileWithData = useCallback(async (fileId: string, password: string): Promise<Result<FileWithRelatedData, unknown>> => {
    console.log('📁 Starting secure loadFileWithData with fileId:', fileId);
    setLoading(true);
    setError(null);

    // Check Web Crypto API support
    if (!isWebCryptoSupported()) {
      const error = new Error('Web Crypto API not supported in this browser');
      console.error('❌ Web Crypto API not supported');
      setError(error);
      setLoading(false);
      return { ok: false, error };
    }

    return await AsyncResultWrapper
      .from(Promise.all([
        // Load file metadata
        api.safe.get(`/files/id/${fileId}`) as Promise<Result<FileType, unknown>>,
        // Load file blob with secure RSA encrypted password
        (async (): Promise<Result<Blob, unknown>> => {
          try {
            console.log('🔐 Encrypting password for secure file download...');
            
            // Encrypt the password using ephemeral RSA key
            const encryptedPasswordData = await encryptPasswordSecurely(password);
            
            // Send secure POST request with encrypted password
            const response = await api.safe.post(`/files/id/${fileId}/download`, {
              key_id: encryptedPasswordData.keyId,
              encrypted_password: encryptedPasswordData.encryptedPassword,
              stream: false
            }, {
              responseType: "blob"
            });
            
            console.log('✅ Secure file download completed');
            return response as Result<Blob, unknown>;
            
          } catch (error) {
            console.error('❌ Secure file download failed:', error);
            return { ok: false, error };
          }
        })(),
        // TODO: Load prompts and selections from document endpoint when we have document ID
        // For now, return empty arrays
        Promise.resolve({ ok: true, value: [] } as Result<PromptType[], unknown>),
        Promise.resolve({ ok: true, value: [] } as Result<SelectionType[], unknown>)
      ]).then(async ([fileResult, blobResult, promptsResult, selectionsResult]) => {
        console.log('📁 File loading results:', { fileResult, blobResult, promptsResult, selectionsResult });
        
        // Check if all results are successful
        if (!fileResult.ok) {
          console.error('❌ File metadata failed:', fileResult.error);
          return fileResult;
        }
        if (!blobResult.ok) {
          console.error('❌ File blob failed:', blobResult.error);
          return blobResult;
        }
        if (!promptsResult.ok) {
          console.error('❌ Prompts failed:', promptsResult.error);
          return promptsResult;
        }
        if (!selectionsResult.ok) {
          console.error('❌ Selections failed:', selectionsResult.error);
          return selectionsResult;
        }

        const fileWithData: FileWithRelatedData = {
          file: fileResult.value,
          blob: blobResult.value,
          prompts: promptsResult.value,
          selections: selectionsResult.value
        };

        console.log('✅ Successfully created fileWithData:', fileWithData);
        return { ok: true, value: fileWithData } as Result<FileWithRelatedData, unknown>;
      }))
      .tap((fileData) => {
        console.log('📁 Setting file data:', fileData);
        setCurrentFileData(fileData);
        toast.success("File loaded successfully", {
          description: `Loaded file ${fileData.file.id}`
        });
      })
      .catch((error: unknown) => {
        console.error('❌ Error in loadFileWithData:', error);
        setError(error);
        toast.error(
          "Failed to load file",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
      })
      .finally(() => setLoading(false))
      .toResult();
  }, []);

  const loadFileById = useCallback(async (documentId: string, password: string): Promise<Result<FileWithRelatedData, unknown>> => {
    setLoading(true);
    setError(null);

    // First get the document to find its original file
    return await AsyncResultWrapper
      .from(api.safe.get(`/documents/id/${documentId}`) as Promise<Result<{ files: FileType[] }, unknown>>)
      .andThen(async (document) => {
        // Find the original file
        const originalFile = document.files?.find(f => f.file_type === 'original');
        if (!originalFile) {
          return { ok: false, error: new Error('No original file found for this document') };
        }
        return loadFileWithData(originalFile.id, password);
      })
      .toResult();
  }, [loadFileWithData]);

  const clearFileData = useCallback(() => {
    setCurrentFileData(null);
    setError(null);
  }, []);

  return {
    currentFileData,
    loading,
    error,
    loadFileWithData,
    loadFileById,
    clearFileData
  };
}
