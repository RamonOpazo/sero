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

  const loadOriginalFileByDocumentId = useCallback(async (documentId: string, password: string): Promise<Result<FileWithRelatedData, unknown>> => {
    console.log('📁 Starting loadOriginalFileByDocumentId with documentId:', documentId);
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
        // Get file blob using new document-based endpoint
        (async (): Promise<Result<{ blob: Blob; fileName: string }, unknown>> => {
          try {
            console.log('🔐 Encrypting password for original file download...');
            
            // Encrypt the password using ephemeral RSA key
            const encryptedPasswordData = await encryptPasswordSecurely(password);
            
            // Send secure POST request to new document-based endpoint
            const response = await api.safe.post(`/documents/id/${documentId}/download/original`, {
              key_id: encryptedPasswordData.keyId,
              encrypted_password: encryptedPasswordData.encryptedPassword,
              stream: false
            }, {
              responseType: "blob"
            });
            
            if (!response.ok) {
              console.error('❌ Document-based original file download failed:', response.error);
              return response;
            }

            console.log('✅ Document-based original file download completed');
            
            // Generate a default filename since we don't have access to headers in the current API response structure
            const fileName = `document_${documentId}_original.pdf`;
            
            return { ok: true, value: { blob: response.value as Blob, fileName } };
            
          } catch (error) {
            console.error('❌ Document-based original file download failed:', error);
            return { ok: false, error };
          }
        })(),
        // TODO: Load prompts and selections from document endpoint
        // For now, return empty arrays
        Promise.resolve({ ok: true, value: [] } as Result<PromptType[], unknown>),
        Promise.resolve({ ok: true, value: [] } as Result<SelectionType[], unknown>)
      ]).then(async ([downloadResult, promptsResult, selectionsResult]) => {
        console.log('📁 Document-based file loading results:', { downloadResult, promptsResult, selectionsResult });
        
        if (!downloadResult.ok) {
          console.error('❌ File download failed:', downloadResult.error);
          return downloadResult;
        }
        if (!promptsResult.ok) {
          console.error('❌ Prompts failed:', promptsResult.error);
          return promptsResult;
        }
        if (!selectionsResult.ok) {
          console.error('❌ Selections failed:', selectionsResult.error);
          return selectionsResult;
        }

        // Create a synthetic file object since we don't have file metadata from document endpoint
        const syntheticFile: FileType = {
          id: `${documentId}-original`,
          created_at: new Date().toISOString(),
          updated_at: null,
          file_hash: 'unknown', // We don't have this from the endpoint
          file_type: 'original',
          file_size: downloadResult.value.blob.size,
          mime_type: 'application/pdf',
          data: '', // We don't store the raw data, just the blob
          salt: null, // Not relevant for blob usage
          document_id: documentId
        };

        const fileWithData: FileWithRelatedData = {
          file: syntheticFile,
          blob: downloadResult.value.blob,
          prompts: promptsResult.value,
          selections: selectionsResult.value
        };

        console.log('✅ Successfully created document-based fileWithData:', fileWithData);
        return { ok: true, value: fileWithData } as Result<FileWithRelatedData, unknown>;
      }))
      .tap((fileData) => {
        console.log('📁 Setting document-based file data:', fileData);
        setCurrentFileData(fileData);
        toast.success("Original file loaded successfully", {
          description: `Loaded original file for document`
        });
      })
      .catch((error: unknown) => {
        console.error('❌ Error in loadOriginalFileByDocumentId:', error);
        setError(error);
        toast.error(
          "Failed to load original file",
          { description: error instanceof Error ? error.message : "Please check your password and try again." }
        );
      })
      .finally(() => setLoading(false))
      .toResult();
  }, []);

  const loadRedactedFileByDocumentId = useCallback(async (documentId: string): Promise<Result<FileWithRelatedData, unknown>> => {
    console.log('📁 Starting loadRedactedFileByDocumentId with documentId:', documentId);
    setLoading(true);
    setError(null);

    return await AsyncResultWrapper
      .from(Promise.all([
        // Get file blob using new document-based endpoint (no password needed)
        (async (): Promise<Result<{ blob: Blob; fileName: string }, unknown>> => {
          try {
            console.log('📄 Downloading redacted file (no password required)...');
            
            // Send GET request to new document-based redacted file endpoint
            const response = await api.safe.get(`/documents/id/${documentId}/download/redacted`, {
              responseType: "blob"
            });
            
            if (!response.ok) {
              console.error('❌ Document-based redacted file download failed:', response.error);
              return response;
            }

            console.log('✅ Document-based redacted file download completed');
            
            // Generate a default filename since we don't have access to headers in the current API response structure
            const fileName = `document_${documentId}_redacted.pdf`;
            
            return { ok: true, value: { blob: response.value as Blob, fileName } };
            
          } catch (error) {
            console.error('❌ Document-based redacted file download failed:', error);
            return { ok: false, error };
          }
        })(),
        // TODO: Load prompts and selections from document endpoint
        // For now, return empty arrays
        Promise.resolve({ ok: true, value: [] } as Result<PromptType[], unknown>),
        Promise.resolve({ ok: true, value: [] } as Result<SelectionType[], unknown>)
      ]).then(async ([downloadResult, promptsResult, selectionsResult]) => {
        console.log('📁 Document-based redacted file loading results:', { downloadResult, promptsResult, selectionsResult });
        
        if (!downloadResult.ok) {
          console.error('❌ Redacted file download failed:', downloadResult.error);
          return downloadResult;
        }
        if (!promptsResult.ok) {
          console.error('❌ Prompts failed:', promptsResult.error);
          return promptsResult;
        }
        if (!selectionsResult.ok) {
          console.error('❌ Selections failed:', selectionsResult.error);
          return selectionsResult;
        }

        // Create a synthetic file object for redacted file
        const syntheticFile: FileType = {
          id: `${documentId}-redacted`,
          created_at: new Date().toISOString(),
          updated_at: null,
          file_hash: 'unknown',
          file_type: 'redacted',
          file_size: downloadResult.value.blob.size,
          mime_type: 'application/pdf',
          data: '',
          salt: null, // Redacted files are not encrypted
          document_id: documentId
        };

        const fileWithData: FileWithRelatedData = {
          file: syntheticFile,
          blob: downloadResult.value.blob,
          prompts: promptsResult.value,
          selections: selectionsResult.value
        };

        console.log('✅ Successfully created document-based redacted fileWithData:', fileWithData);
        return { ok: true, value: fileWithData } as Result<FileWithRelatedData, unknown>;
      }))
      .tap((fileData) => {
        console.log('📁 Setting document-based redacted file data:', fileData);
        setCurrentFileData(fileData);
        toast.success("Redacted file loaded successfully", {
          description: `Loaded redacted file for document`
        });
      })
      .catch((error: unknown) => {
        console.error('❌ Error in loadRedactedFileByDocumentId:', error);
        setError(error);
        toast.error(
          "Failed to load redacted file",
          { description: error instanceof Error ? error.message : "Please try again." }
        );
      })
      .finally(() => setLoading(false))
      .toResult();
  }, []);

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
    loadOriginalFileByDocumentId,
    loadRedactedFileByDocumentId,
    clearFileData
  };
}
