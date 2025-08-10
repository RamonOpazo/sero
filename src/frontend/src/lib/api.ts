import { api } from "@/lib/axios"
import { FileDownloadRequestSchema, type ApiResponse } from "@/types";
import type {
  ProjectType,
  ProjectCreateType,
  ProjectUpdateType,
  ProjectShallowType,
  ProjectSummaryType,
  DocumentType,
  DocumentShallowType,
  DocumentSummaryType,
  FileDownloadRequestType,
} from "@/types";
import { type Result } from "@/lib/result";

export const getProjectById = async (id: string): Promise<Result<ProjectType, unknown>> => {
  return await api.safe.get(`/projects/id/summary/${id}`)
}

export const deleteProjectById = async (id: string): Promise<Result<ApiResponse, unknown>> => {
  return api.safe.delete(`/projects/id/${id}`)
}

export const createProject = async (data: ProjectCreateType): Promise<Result<ProjectType, unknown>> => {
  return api.safe.post(`/projects`, data)
}

export const updateProject = async (id: string, data: ProjectUpdateType): Promise<Result<ProjectType, unknown>> => {
  return api.safe.put(`/projects/id/${id}`, data)
}

export const getProjectList = async (): Promise<Result<ProjectType[], unknown>> => {
  return api.safe.get(`/projects`)
}

export const getShallowProjectList = async (): Promise<Result<ProjectShallowType[], unknown>> => {
  return api.safe.get(`/projects/shallow`)
}

export const getProjectSummary = async (): Promise<Result<ProjectSummaryType[], unknown>> => {
  return api.safe.get(`/projects/summary`)
}

export const getDocumentById = async (id: string): Promise<Result<DocumentType, unknown>> => {
  return api.safe.get(`/documents/id/${id}`)
}

export const getDocumentList = async (): Promise<Result<DocumentType[], unknown>> => {
  return api.safe.get(`/projects`)
}

export const getShallowDocumentList = async (): Promise<Result<DocumentShallowType[], unknown>> => {
  return api.safe.get(`/projects/shallow`)
}

export const getDocumentSummary = async (): Promise<Result<DocumentSummaryType[], unknown>> => {
  return api.safe.get(`/projects/summary`)
}

export const deleteFileById = async (id: string): Promise<Result<ApiResponse, unknown>> => {
  return api.safe.delete(`/api/files/id/${id}`)
}

export const getFileBlob = async (input: FileDownloadRequestType): Promise<Result<Blob, unknown>> => {
  const { file_id, password, stream } = FileDownloadRequestSchema.parse(input);
  return api.safe.get(`/files/id/${file_id}/download`, {
    params: { password, stream },
    responseType: "blob",
  });
};
