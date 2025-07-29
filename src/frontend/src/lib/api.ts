import { z } from "zod";
import { api } from "@/lib/axios"
import { FileDownloadRequestSchema } from "@/types";

export const getDocumentById = (id: string) =>
  api.get(`/documents/id/${id}`).then(res => res.data)

export const getFileBlob = async (
  input: z.infer<typeof FileDownloadRequestSchema>
): Promise<Blob> => {
  const validated = FileDownloadRequestSchema.parse(input);

  const { file_id, password, stream } = validated;

  const response = await api.get(`/files/id/${file_id}/download`, {
    params: {
      password,
      stream,
    },
    responseType: "blob",
  });

  return response.data;
};
