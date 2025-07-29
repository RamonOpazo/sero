import { api } from "@/lib/axios"

export const getDocumentById = (id: string) =>
  api.get(`/documents/id/${id}`).then(res => res.data)
