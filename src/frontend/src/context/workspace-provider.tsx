import React, { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useDocuments } from '@/hooks/useDocuments';
import { useFiles } from '@/hooks/useFiles';
import type { 
  ProjectShallowType, 
  DocumentShallowType, 
  FileType,
  PromptType,
  SelectionType,
  ProjectCreateType,
  ProjectUpdateType,
} from '@/types';

// Workspace state structure - manages projects, documents, and files across the application
interface WorkspaceState {
  // Current selections
  currentProject: ProjectShallowType | null;
  currentDocument: DocumentShallowType | null;
  currentFile: {
    file: FileType | null;
    blob: Blob | null;
    prompts: PromptType[];
    selections: SelectionType[];
  } | null;
  
  // Lists for datatables
  projects: ProjectShallowType[];
  documents: DocumentShallowType[];
  
  // Loading states
  isLoadingProjects: boolean;
  isLoadingDocuments: boolean;
  isLoadingFile: boolean;
  
  // Error states
  projectsError: string | null;
  documentsError: string | null;
  fileError: string | null;
}

// Workspace action types
type WorkspaceAction =
  | { type: 'SET_LOADING_PROJECTS'; payload: boolean }
  | { type: 'SET_LOADING_DOCUMENTS'; payload: boolean }
  | { type: 'SET_LOADING_FILE'; payload: boolean }
  | { type: 'SET_PROJECTS'; payload: ProjectShallowType[] }
  | { type: 'SET_DOCUMENTS'; payload: DocumentShallowType[] }
  | { type: 'SET_CURRENT_PROJECT'; payload: ProjectShallowType | null }
  | { type: 'SET_CURRENT_DOCUMENT'; payload: DocumentShallowType | null }
  | { type: 'SET_CURRENT_FILE'; payload: { file: FileType; blob: Blob; prompts: PromptType[]; selections: SelectionType[] } | null }
  | { type: 'SET_PROJECTS_ERROR'; payload: string | null }
  | { type: 'SET_DOCUMENTS_ERROR'; payload: string | null }
  | { type: 'SET_FILE_ERROR'; payload: string | null }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'RESET_STATE' }
  | { type: 'RESTORE_PERSISTED_STATE'; payload: Partial<WorkspaceState> };

// Initial workspace state
const initialState: WorkspaceState = {
  currentProject: null,
  currentDocument: null,
  currentFile: null,
  projects: [],
  documents: [],
  isLoadingProjects: false,
  isLoadingDocuments: false,
  isLoadingFile: false,
  projectsError: null,
  documentsError: null,
  fileError: null,
};

// Workspace state reducer
function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_LOADING_PROJECTS':
      return { ...state, isLoadingProjects: action.payload };
    case 'SET_LOADING_DOCUMENTS':
      return { ...state, isLoadingDocuments: action.payload };
    case 'SET_LOADING_FILE':
      return { ...state, isLoadingFile: action.payload };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload, projectsError: null };
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload, documentsError: null };
    case 'SET_CURRENT_PROJECT':
      return { 
        ...state, 
        currentProject: action.payload,
        // Clear document-related data when project changes
        currentDocument: null,
        currentFile: null,
        documents: [],
      };
    case 'SET_CURRENT_DOCUMENT':
      return { 
        ...state, 
        currentDocument: action.payload,
        // Clear file data when document changes
        currentFile: null,
      };
    case 'SET_CURRENT_FILE':
      return { ...state, currentFile: action.payload };
    case 'SET_PROJECTS_ERROR':
      return { ...state, projectsError: action.payload, isLoadingProjects: false };
    case 'SET_DOCUMENTS_ERROR':
      return { ...state, documentsError: action.payload, isLoadingDocuments: false };
    case 'SET_FILE_ERROR':
      return { ...state, fileError: action.payload, isLoadingFile: false };
    case 'CLEAR_ALL_ERRORS':
      return { ...state, projectsError: null, documentsError: null, fileError: null };
    case 'RESET_STATE':
      return initialState;
    case 'RESTORE_PERSISTED_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Persistence utilities
const STORAGE_KEY = 'sero-refactor-state';

interface PersistedState {
  currentProject: ProjectShallowType | null;
  currentDocument: DocumentShallowType | null;
  // Note: we don't persist currentFile as it contains blobs which can't be serialized
}

function saveStateToStorage(state: WorkspaceState) {
  try {
    const persistedState: PersistedState = {
      currentProject: state.currentProject,
      currentDocument: state.currentDocument,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
  }
}

function loadStateFromStorage(): PersistedState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as PersistedState;
    }
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
  }
  return null;
}

function clearStoredState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear stored state:', error);
  }
}

// Workspace context interface
interface WorkspaceContextType {
  state: WorkspaceState;
  
  // Project actions
  loadProjects: () => Promise<void>;
  selectProject: (project: ProjectShallowType) => void;
  clearProjectSelection: () => void;
  createProject: (projectData: ProjectCreateType) => Promise<void>;
  updateProject: (projectId: string, projectData: ProjectUpdateType) => Promise<void>;
  deleteProjects: (projects: ProjectShallowType[]) => Promise<void>;
  
  // Document actions
  loadDocuments: (projectId: string) => Promise<void>;
  selectDocument: (document: DocumentShallowType) => void;
  clearDocumentSelection: () => void;
  
  // File actions
  loadFile: (fileId: string, password: string) => Promise<void>;
  clearFileSelection: () => void;
  
  // Utility actions
  clearAllErrors: () => void;
  resetState: () => void;
}

// Create workspace context
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Workspace provider component
interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  
  // Use the hooks for API calls
  const projectsHook = useProjects();
  const documentsHook = useDocuments();
  const filesHook = useFiles();

  // Initialize state from localStorage on mount
  useEffect(() => {
    const persistedState = loadStateFromStorage();
    if (persistedState) {
      console.log('🔄 Restoring persisted state:', persistedState);
      dispatch({ type: 'RESTORE_PERSISTED_STATE', payload: persistedState });
      
      // Show notification about state restoration
      if (persistedState.currentProject) {
        toast.info('Restored previous session', {
          description: `Returning to project "${persistedState.currentProject.name}"`,
        });
      }
    }
  }, []);

  // Re-fetch data based on restored state
  useEffect(() => {
    const initializeFromPersistedState = async () => {
      // Always load projects first
      await projectsHook.refreshProjects();
      
      // If we have a persisted project, load its documents
      if (state.currentProject) {
        console.log('🔄 Re-loading documents for persisted project:', state.currentProject.name);
        await documentsHook.refreshDocumentsForProject(state.currentProject.id);
      }
    };

    initializeFromPersistedState();
  }, [state.currentProject?.id]); // Only depend on project ID to avoid infinite loops

  // Persist state changes to localStorage
  useEffect(() => {
    // Only persist if we have meaningful state changes (not during initial load)
    if (state.currentProject || state.currentDocument) {
      saveStateToStorage(state);
    }
  }, [state.currentProject, state.currentDocument]);

  // Sync hook state with provider state
  React.useEffect(() => {
    dispatch({ type: 'SET_PROJECTS', payload: projectsHook.projects });
    dispatch({ type: 'SET_LOADING_PROJECTS', payload: projectsHook.loading });
    dispatch({ type: 'SET_PROJECTS_ERROR', payload: projectsHook.error ? String(projectsHook.error) : null });
  }, [projectsHook.projects, projectsHook.loading, projectsHook.error]);

  React.useEffect(() => {
    dispatch({ type: 'SET_DOCUMENTS', payload: documentsHook.documents });
    dispatch({ type: 'SET_LOADING_DOCUMENTS', payload: documentsHook.loading });
    dispatch({ type: 'SET_DOCUMENTS_ERROR', payload: documentsHook.error ? String(documentsHook.error) : null });
  }, [documentsHook.documents, documentsHook.loading, documentsHook.error]);

  React.useEffect(() => {
    if (filesHook.currentFileData) {
      dispatch({ 
        type: 'SET_CURRENT_FILE', 
        payload: {
          file: filesHook.currentFileData.file,
          blob: filesHook.currentFileData.blob,
          prompts: filesHook.currentFileData.prompts,
          selections: filesHook.currentFileData.selections,
        }
      });
    } else {
      dispatch({ type: 'SET_CURRENT_FILE', payload: null });
    }
    dispatch({ type: 'SET_LOADING_FILE', payload: filesHook.loading });
    dispatch({ type: 'SET_FILE_ERROR', payload: filesHook.error ? String(filesHook.error) : null });
  }, [filesHook.currentFileData, filesHook.loading, filesHook.error]);

  // Project actions
  const loadProjects = useCallback(async () => {
    await projectsHook.refreshProjects();
  }, [projectsHook.refreshProjects]);

  const selectProject = useCallback((project: ProjectShallowType) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
    toast.success(`Selected project: ${project.name}`);
  }, []);

  const clearProjectSelection = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: null });
    clearStoredState(); // Clear persisted state when manually clearing
  }, []);

  // Document actions
  const loadDocuments = useCallback(async (projectId: string) => {
    await documentsHook.refreshDocumentsForProject(projectId);
  }, [documentsHook.refreshDocumentsForProject]);

  const selectDocument = useCallback((document: DocumentShallowType) => {
    dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: document });
    toast.success(`Selected document: ${document.name}`);
  }, []);

  const clearDocumentSelection = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: null });
  }, []);

  // File actions
  const loadFile = useCallback(async (fileId: string, password: string) => {
    await filesHook.loadFileWithData(fileId, password);
  }, [filesHook.loadFileWithData]);

  const clearFileSelection = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_FILE', payload: null });
  }, []);

  // Utility actions
  const clearAllErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    clearStoredState(); // Clear persisted state when resetting
  }, []);

  // CRUD operations
  const createProject = useCallback(async (projectData: ProjectCreateType) => {
    const result = await projectsHook.createProject(projectData);
    if (result.ok) {
      // Project list will be automatically refreshed by the hook
      return Promise.resolve();
    } else {
      return Promise.reject(result.error);
    }
  }, [projectsHook.createProject]);

  const updateProject = useCallback(async (projectId: string, projectData: ProjectUpdateType) => {
    const result = await projectsHook.updateProject(projectId, projectData);
    if (result.ok) {
      // Project list will be automatically refreshed by the hook
      return Promise.resolve();
    } else {
      return Promise.reject(result.error);
    }
  }, [projectsHook.updateProject]);

  const deleteProjects = useCallback(async (projects: ProjectShallowType[]) => {
    const result = await projectsHook.deleteProjects(projects);
    if (result.ok) {
      // Project list will be automatically refreshed by the hook
      // Clear current project if it was deleted
      if (state.currentProject && projects.some(p => p.id === state.currentProject?.id)) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: null });
      }
      return Promise.resolve();
    } else {
      return Promise.reject(result.error);
    }
  }, [projectsHook.deleteProjects, state.currentProject]);

  const contextValue: WorkspaceContextType = useMemo(() => ({
    state,
    loadProjects,
    selectProject,
    clearProjectSelection,
    createProject,
    updateProject,
    deleteProjects,
    loadDocuments,
    selectDocument,
    clearDocumentSelection,
    loadFile,
    clearFileSelection,
    clearAllErrors,
    resetState,
  }), [
    state,
    loadProjects,
    selectProject,
    clearProjectSelection,
    createProject,
    updateProject,
    deleteProjects,
    loadDocuments,
    selectDocument,
    clearDocumentSelection,
    loadFile,
    clearFileSelection,
    clearAllErrors,
    resetState,
  ]);

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// Custom hook to use the workspace context
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
