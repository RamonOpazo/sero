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

export interface File {
  id: string
  created_at: string
  updated_at: string | null
  document_id: string
  filename: string
  mime_type: string
  size: string
  salt: string
  file_hash: string
  is_original_file: boolean
  selections: Selection[]
  prompts: Prompt[]
}

export interface Selection {
  id: string
  created_at: string
  updated_at: string | null
  file_id: string
  label: string
  page_number: number
  x: number
  y: number
  width: number
  height: number
  confidence: number
  is_ai_generated: boolean
}

export interface Prompt {
  id: string
  created_at: string
  updated_at: string | null
  file_id: string
  label: string
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
