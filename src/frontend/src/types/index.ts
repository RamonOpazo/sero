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
  obfuscated_count: number
  status: 'awaiting' | 'in_progress' | 'completed'
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
  description: string | null
  status: DocumentStatus
  original_file: File | null
  obfuscated_file: File | null
  // Computed properties for convenience
  selections?: Selection[]
  prompts?: Prompt[]
}

export interface DocumentCreate {
  project_id: string
  title: string
  description?: string
}

export interface DocumentUpload {
  project_id: string
  files: FileList
  description?: string
  password: string
}

export interface File {
  id: string
  created_at: string
  updated_at: string | null
  document_id: string
  filename: string
  mime_type: string
  size: number
  salt: string
  file_hash: string
  is_original_file: boolean
  selections: Selection[]
  prompts: Prompt[]
  selection_count: number
  prompt_count: number
}

export interface Selection {
  id: string
  created_at: string
  updated_at: string | null
  file_id: string
  label: string | null
  page_number: number | null
  x: number
  y: number
  width: number
  height: number
  confidence: number | null
  is_ai_generated: boolean
}

export interface Prompt {
  id: string
  created_at: string
  updated_at: string | null
  file_id: string
  label: string | null
  text: string
  languages: PromptLanguage[]
  temperature: number
}

// Match backend enums exactly
export type DocumentStatus = 'pending' | 'processed' | 'failed'
export type PromptLanguage = 'catalonian' | 'castillian' | 'english'

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
