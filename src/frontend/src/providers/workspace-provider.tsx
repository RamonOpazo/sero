import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import type { 
  ProjectShallowType, 
  DocumentShallowType,
} from '@/types';

// Workspace state structure - manages current selections and file state across the application
interface WorkspaceState {
  // Current selections
  currentProject: ProjectShallowType | null;
  currentDocument: DocumentShallowType | null;
}

// Workspace action types
type WorkspaceAction =
  | { type: 'SET_CURRENT_PROJECT'; payload: ProjectShallowType | null }
  | { type: 'SET_CURRENT_DOCUMENT'; payload: DocumentShallowType | null }
  | { type: 'RESET_STATE' }
  | { type: 'RESTORE_PERSISTED_STATE'; payload: Partial<WorkspaceState> };

// Initial workspace state
const initialState: WorkspaceState = {
  currentProject: null,
  currentDocument: null,
};

// Workspace state reducer
function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_CURRENT_PROJECT':
      return { 
        ...state, 
        currentProject: action.payload,
        // Clear document when project changes
        currentDocument: null,
      };
    case 'SET_CURRENT_DOCUMENT':
      return { 
        ...state, 
        currentDocument: action.payload,
      };
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
  
  // Workspace utility actions
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

  // Utility actions

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
    resetState,
  }), [
    state,
    selectProject,
    clearProjectSelection,
    selectDocument,
    clearDocumentSelection,
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
