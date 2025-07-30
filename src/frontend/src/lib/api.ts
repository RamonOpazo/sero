import { api } from "@/lib/axios"
import { FileDownloadRequestSchema } from "@/types";
import type {
  ProjectType,
  ProjectShallowType,
  ProjectSummaryType,
  DocumentType,
  DocumentShallowType,
  DocumentSummaryType,
  FileDownloadRequestType,
} from "@/types";

export const getProjectById = async (id: string): Promise<ProjectType> => {
  const res = await api.get(`/projects/id/summary/${id}`)
  return res.data as ProjectType
}

export const getProjectList = async (): Promise<ProjectType[]> => {
  const res = await api.get(`/projects`)
  return res.data as ProjectType[]
}

export const getShallowProjectList = async (): Promise<ProjectShallowType[]> => {
  const res = await api.get(`/projects/shallow`)
  return res.data as ProjectShallowType[]
}

export const getProjectSummary = async (): Promise<ProjectSummaryType[]> => {
  const res = await api.get(`/projects/summary`)
  return res.data as ProjectSummaryType[]
}

export const getDocumentById = async (id: string): Promise<DocumentType> => {
  const res = await api.get(`/documents/id/${id}`)
  return res.data as DocumentType
}

export const getDocumentList = async (): Promise<DocumentType[]> => {
  const res = await api.get(`/projects`)
  return res.data as DocumentType[]
}

export const getShallowDocumentList = async (): Promise<DocumentShallowType[]> => {
  const res = await api.get(`/projects/shallow`)
  return res.data as DocumentShallowType[]
}

export const getDocumentSummary = async (): Promise<DocumentSummaryType[]> => {
  const res = await api.get(`/projects/summary`)
  return res.data as DocumentSummaryType[]
}

export const getFileBlob = async (input: FileDownloadRequestType): Promise<Blob> => {
  const { file_id, password, stream } = FileDownloadRequestSchema.parse(input);
  const res = await api.get(`/files/id/${file_id}/download`,{
    params: { password, stream },
    responseType: "blob",
  });

  return res.data as Blob
};