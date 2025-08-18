import React, { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { useFiles } from '@/hooks/useFiles';
import type { 
  ProjectShallowType, 
  DocumentShallowType, 
  FileType,
  PromptType,
  SelectionType,
} from '@/types';

// Workspace state structure - manages current selections and file state across the application
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
  
  // Loading states
  isLoadingFile: boolean;
  
  // Error states
  fileError: string | null;
}

// Workspace action types
type WorkspaceAction =
  | { type: 'SET_LOADING_FILE'; payload: boolean }
  | { type: 'SET_CURRENT_PROJECT'; payload: ProjectShallowType | null }
  | { type: 'SET_CURRENT_DOCUMENT'; payload: DocumentShallowType | null }
  | { type: 'SET_CURRENT_FILE'; payload: { file: FileType; blob: Blob; prompts: PromptType[]; selections: SelectionType[] } | null }
  | { type: 'SET_FILE_ERROR'; payload: string | null }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'RESET_STATE' }
  | { type: 'RESTORE_PERSISTED_STATE'; payload: Partial<WorkspaceState> };

// Initial workspace state
const initialState: WorkspaceState = {
  currentProject: null,
  currentDocument: null,
  currentFile: null,
  isLoadingFile: false,
  fileError: null,
};

// Workspace state reducer
function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_LOADING_FILE':
      return { ...state, isLoadingFile: action.payload };
    case 'SET_CURRENT_PROJECT':
      return { 
        ...state, 
        currentProject: action.payload,
        // Clear document-related data when project changes
        currentDocument: null,
        currentFile: null,
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
    case 'SET_FILE_ERROR':
      return { ...state, fileError: action.payload, isLoadingFile: false };
    case 'CLEAR_ALL_ERRORS':
      return { ...state, fileError: null };
    case 'RESET_STATE':
      return initialState;
    case 'RESTORE_PERSISTED_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// Workspace persistence utilities
const STORAGE_KEY = 'sero-workspace-state';

interface PersistedWorkspaceState {
  currentProject: ProjectShallowType | null;
  currentDocument: DocumentShallowType | null;
  // Note: we don't persist currentFile as it contains blobs which can't be serialized
}

function saveWorkspaceToStorage(state: WorkspaceState) {
  try {
    const persistedState: PersistedWorkspaceState = {
      currentProject: state.currentProject,
      currentDocument: state.currentDocument,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch (error) {
    console.warn('Failed to save workspace state to localStorage:', error);
  }
}

function loadWorkspaceFromStorage(): PersistedWorkspaceState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as PersistedWorkspaceState;
    }
  } catch (error) {
    console.warn('Failed to load workspace state from localStorage:', error);
  }
  return null;
}

function clearWorkspaceStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear workspace state:', error);
  }
}

// Workspace context interface - provides access to app-wide workspace state and actions
interface WorkspaceContextType {
  state: WorkspaceState;
  
  // Project selection management (not CRUD - that's handled by components)
  selectProject: (project: ProjectShallowType) => void;
  clearProjectSelection: () => void;
  
  // Document selection management (not CRUD - that's handled by components)
  selectDocument: (document: DocumentShallowType) => void;
  clearDocumentSelection: () => void;
  
  // File management actions
  loadFile: (fileId: string, password: string) => Promise<void>;
  clearFileSelection: () => void;
  
  // Workspace utility actions
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
  
  // Use the file hook for file management
  const filesHook = useFiles();

  // Initialize workspace state from localStorage on mount
  useEffect(() => {
    const persistedWorkspace = loadWorkspaceFromStorage();
    if (persistedWorkspace) {
      console.log('🔄 Restoring persisted workspace:', persistedWorkspace);
      dispatch({ type: 'RESTORE_PERSISTED_STATE', payload: persistedWorkspace });
      
      // Show notification about workspace restoration
      if (persistedWorkspace.currentProject) {
        toast.info('Restored previous session', {
          description: `Returning to project "${persistedWorkspace.currentProject.name}"`,
        });
      }
    }
  }, []);

  // Persist workspace state changes to localStorage
  useEffect(() => {
    // Only persist if we have meaningful workspace changes (not during initial load)
    if (state.currentProject || state.currentDocument) {
      saveWorkspaceToStorage(state);
    }
  }, [state.currentProject, state.currentDocument]);

  // Sync file hook state with provider state
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

  // Project selection actions (not CRUD - components handle that)
  const selectProject = useCallback((project: ProjectShallowType) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
    toast.success(`Selected project: ${project.name}`);
  }, []);

  const clearProjectSelection = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: null });
    clearWorkspaceStorage(); // Clear persisted workspace when manually clearing
  }, []);

  // Document selection actions (not CRUD - components handle that)
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
    clearWorkspaceStorage(); // Clear persisted workspace when resetting
  }, []);

  // No project or document CRUD operations - components handle these directly

  const contextValue: WorkspaceContextType = useMemo(() => ({
    state,
    selectProject,
    clearProjectSelection,
    selectDocument,
    clearDocumentSelection,
    loadFile,
    clearFileSelection,
    clearAllErrors,
    resetState,
  }), [
    state,
    selectProject,
    clearProjectSelection,
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
