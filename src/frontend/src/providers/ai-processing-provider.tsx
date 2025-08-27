import { createContext, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';

export type AiProcessingKind = 'document' | 'project';

export interface AiProcessingMeta {
  documentId?: string;
  projectId?: string;
  runId?: string;
}

export interface AiProcessingWarning {
  message: string;
  code?: string;
}

export interface AiProcessingJob {
  id: string; // documentId or `project:<projectId>`
  kind: AiProcessingKind;
  title: string;
  stage: string; // current milestone/stage, e.g., 'loading_model'
  stageIndex: number;
  stageTotal: number;
  percent: number; // 0..100
  hints: string[]; // small milestone/subtask breadcrumbs
  warning?: AiProcessingWarning | null;
  batchProcessed?: number; // project-only
  batchTotal?: number; // project-only
  link?: string; // optional details route
  meta?: AiProcessingMeta;
}

interface AiProcessingState {
  jobs: Record<string, AiProcessingJob>;
  order: string[]; // recent-first or first-in; we can adjust later
}

const initialState: AiProcessingState = {
  jobs: {},
  order: [],
};

// Actions
export type AiProcessingAction =
  | { type: 'START_JOB'; payload: AiProcessingJob }
  | { type: 'UPDATE_JOB'; payload: Partial<AiProcessingJob> & { id: string } }
  | { type: 'COMPLETE_JOB'; payload: { id: string } }
  | { type: 'FAIL_JOB'; payload: { id: string; warning?: AiProcessingWarning } }
  | { type: 'CLEAR_JOB'; payload: { id: string } };

function reducer(state: AiProcessingState, action: AiProcessingAction): AiProcessingState {
  switch (action.type) {
    case 'START_JOB': {
      const { payload } = action;
      return {
        jobs: { ...state.jobs, [payload.id]: payload },
        order: [payload.id, ...state.order.filter((i) => i !== payload.id)],
      };
    }
    case 'UPDATE_JOB': {
      const { id, ...rest } = action.payload;
      const prev = state.jobs[id];
      if (!prev) return state;
      const next: AiProcessingJob = {
        ...prev,
        ...rest,
        // merge hints
        hints: rest.hints ? [...prev.hints, ...rest.hints] : prev.hints,
        // shallow replacement for warning
        warning: rest.warning !== undefined ? (rest.warning as AiProcessingWarning | null) : prev.warning,
      };
      return { ...state, jobs: { ...state.jobs, [id]: next } };
    }
    case 'COMPLETE_JOB': {
      const { id } = action.payload;
      const prev = state.jobs[id];
      if (!prev) return state;
      const next = { ...prev, stage: 'done', percent: 100 };
      return { ...state, jobs: { ...state.jobs, [id]: next } };
    }
    case 'FAIL_JOB': {
      const { id, warning } = action.payload;
      const prev = state.jobs[id];
      if (!prev) return state;
      const next = { ...prev, warning: warning ?? { message: 'Processing failed' } };
      return { ...state, jobs: { ...state.jobs, [id]: next } };
    }
    case 'CLEAR_JOB': {
      const { id } = action.payload;
      if (!state.jobs[id]) return state;
      const { [id]: _removed, ...rest } = state.jobs;
      return { jobs: rest, order: state.order.filter((i) => i !== id) };
    }
    default:
      return state;
  }
}

// Context API
interface AiProcessingContextValue {
  state: AiProcessingState;
  startJob: (job: AiProcessingJob) => void;
  updateJob: (patch: Partial<AiProcessingJob> & { id: string }) => void;
  completeJob: (id: string) => void;
  failJob: (id: string, warning?: AiProcessingWarning) => void;
  clearJob: (id: string) => void;
  registerCancel: (id: string, cancel: () => void) => void;
  cancelJob: (id: string) => void;
}

const AiProcessingContext = createContext<AiProcessingContextValue | null>(null);

export function AiProcessingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const cancelsRef = useRef<Map<string, () => void>>(new Map());

  const api = useMemo<AiProcessingContextValue>(() => ({
    state,
    startJob: (job) => dispatch({ type: 'START_JOB', payload: job }),
    updateJob: (patch) => dispatch({ type: 'UPDATE_JOB', payload: patch }),
    completeJob: (id) => dispatch({ type: 'COMPLETE_JOB', payload: { id } }),
    failJob: (id, warning) => dispatch({ type: 'FAIL_JOB', payload: { id, warning } }),
    clearJob: (id) => {
      const m = cancelsRef.current;
      if (m.has(id)) m.delete(id);
      dispatch({ type: 'CLEAR_JOB', payload: { id } });
    },
    registerCancel: (id, cancel) => {
      cancelsRef.current.set(id, cancel);
    },
    cancelJob: (id) => {
      const fn = cancelsRef.current.get(id);
      if (fn) {
        try { fn(); } finally { cancelsRef.current.delete(id); }
      }
    },
  }), [state]);

  return (
    <AiProcessingContext.Provider value={api}>
      {children}
    </AiProcessingContext.Provider>
  );
}

export function useAiProcessing() {
  const ctx = useContext(AiProcessingContext);
  if (!ctx) throw new Error('useAiProcessing must be used within AiProcessingProvider');
  return ctx;
}

