import { useState, useCallback } from "react";
import { toast } from 'sonner';
import type { FileDownloadRequestType} from '@/types';
import { FileDownloadRequestSchema } from '@/types';
import { AsyncResultWrapper, type Result, err } from '@/lib/result';
import { api } from "@/lib/axios";

export function useFile() {
  const [ fileId, setFileId ] = useState<string>();
  const [ file, setFile ] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const fetchFile = useCallback(async (input: FileDownloadRequestType): Promise<Result<Blob, unknown>> => {
    setLoading(true);
    setError(null);

    const { password, stream } = FileDownloadRequestSchema.parse(input)
    if (!fileId) {
      setFile(null);
      return err(new Error("No file ID provided"));
    }

    return await AsyncResultWrapper
      .from(api.safe.get(`/files/id/${fileId}/download`, {
          params: { password, stream },
          responseType: "blob",    
      }) as Promise<Result<Blob, unknown>>)
      .tap(setFile)
      .catch(err => {
        setError(err);
        toast.error(
          "Failed to fetch file",
          { description: "Please refresh the page to try again.", });
      })
      .finally(() => setLoading(false))
      .toResult();
  }, [fileId, setFile])

  return {
    fileId,
    file,
    loading,
    error,
    setFileId,
    setFile,
    setLoading,
    setError,
    fetchFile
  };
}
