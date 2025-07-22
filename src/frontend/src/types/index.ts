export interface Project {
  id: string
  created_at: string
  updated_at: string | null
  name: string
  description: string | null
  version: number
  contact_name: string
  contact_email: string
  password_hash: string
  documents: Document[]
  document_count: number
}

export interface ProjectCreate {
  name: string
  description?: string
  version?: number
  contact_name: string
  contact_email: string
  password: string
}

export interface Document {
  id: string
  created_at: string
  updated_at: string | null
  project_id: string
  title: string
  description: string | null
  status: DocumentStatus
  files: File[]
  selections: Selection[]
  prompts: Prompt[]
}

export interface DocumentCreate {
  project_id: string
  title: string
  description?: string
}

export interface File {
  id: string
  created_at: string
  updated_at: string | null
  document_id: string
  filename: string
  file_path: string
  file_size: number
  file_type: string
  is_original: boolean
  description: string | null
}

export interface Selection {
  id: string
  created_at: string
  updated_at: string | null
  document_id: string
  page_number: number
  x: number
  y: number
  width: number
  height: number
  description: string | null
}

export interface Prompt {
  id: string
  created_at: string
  updated_at: string | null
  document_id: string
  content: string
  order: number
}

// Match backend enums exactly
export type DocumentStatus = 'pending' | 'processed' | 'failed'
export type PromptLanguage = 'catalonian' | 'castillian' | 'english'

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
