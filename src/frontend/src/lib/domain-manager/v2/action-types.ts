// Domain Manager V2 - Action Types and Enums
// Strict type safety with enums following CRUD conventions and generic terminology

// =============================================================================
// ACTION TYPE ENUMS
// =============================================================================

export const CrudActionType = {
  // Loading states
  SET_LOADING: 'SET_LOADING',
  SET_SAVING: 'SET_SAVING',
  SET_CREATING: 'SET_CREATING',
  SET_ERROR: 'SET_ERROR',
  
  // Basic CRUD operations
  LOAD_ITEMS: 'LOAD_ITEMS',
  CREATE_ITEM: 'CREATE_ITEM',
  READ_ITEM: 'READ_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  DELETE_ITEM: 'DELETE_ITEM',
  
  // Bulk operations
  CREATE_ITEMS: 'CREATE_ITEMS',
  UPDATE_ITEMS: 'UPDATE_ITEMS',
  DELETE_ITEMS: 'DELETE_ITEMS',
  
  // Context operations (generic terminology)
  CLEAR_LOCAL_CONTEXT: 'CLEAR_LOCAL_CONTEXT',
  CLEAR_GLOBAL_CONTEXT: 'CLEAR_GLOBAL_CONTEXT'
} as const;

export type CrudActionType = typeof CrudActionType[keyof typeof CrudActionType];

export const HistoryActionType = {
  UNDO: 'UNDO',
  REDO: 'REDO',
  RECORD_CHANGE: 'RECORD_CHANGE',
  CLEAR_HISTORY: 'CLEAR_HISTORY',
  TRUNCATE_HISTORY: 'TRUNCATE_HISTORY'
} as const;

export type HistoryActionType = typeof HistoryActionType[keyof typeof HistoryActionType];

export const FocusActionType = {
  SET_FOCUSED_ITEM: 'SET_FOCUSED_ITEM',
  CLEAR_FOCUSED_ITEM: 'CLEAR_FOCUSED_ITEM',
  SET_FOCUSED_ITEMS: 'SET_FOCUSED_ITEMS',
  TOGGLE_ITEM_FOCUS: 'TOGGLE_ITEM_FOCUS'
} as const;

export type FocusActionType = typeof FocusActionType[keyof typeof FocusActionType];

export const DraftActionType = {
  START_DRAFT: 'START_DRAFT',
  UPDATE_DRAFT: 'UPDATE_DRAFT',
  COMMIT_DRAFT: 'COMMIT_DRAFT',
  DISCARD_DRAFT: 'DISCARD_DRAFT'
} as const;

export type DraftActionType = typeof DraftActionType[keyof typeof DraftActionType];

export const ChangeTrackingActionType = {
  CAPTURE_BASELINE: 'CAPTURE_BASELINE',
  COMMIT_CHANGES: 'COMMIT_CHANGES',
  DISCARD_CHANGES: 'DISCARD_CHANGES',
  RESET_TO_BASELINE: 'RESET_TO_BASELINE'
} as const;

export type ChangeTrackingActionType = typeof ChangeTrackingActionType[keyof typeof ChangeTrackingActionType];

export const BatchActionType = {
  BEGIN_BATCH: 'BEGIN_BATCH',
  END_BATCH: 'END_BATCH',
  EXECUTE_BATCH: 'EXECUTE_BATCH',
  ROLLBACK_BATCH: 'ROLLBACK_BATCH'
} as const;

export type BatchActionType = typeof BatchActionType[keyof typeof BatchActionType];

export const ContextActionType = {
  SET_CONTEXT: 'SET_CONTEXT',
  CLEAR_CONTEXT: 'CLEAR_CONTEXT',
  SWITCH_CONTEXT: 'SWITCH_CONTEXT',
  FILTER_BY_CONTEXT: 'FILTER_BY_CONTEXT'
} as const;

export type ContextActionType = typeof ContextActionType[keyof typeof ContextActionType];

// =============================================================================
// ACTION TYPE UNIONS
// =============================================================================

export type ActionType =
  | CrudActionType
  | HistoryActionType
  | FocusActionType
  | DraftActionType
  | ChangeTrackingActionType
  | BatchActionType
  | ContextActionType;

// =============================================================================
// ACTION INTERFACES
// =============================================================================

export interface BaseAction {
  readonly timestamp: number;
  readonly source: ActionSource;
  readonly metadata?: ReadonlyMap<string, unknown>;
}

export interface CrudAction<T = unknown> extends BaseAction {
  readonly type: CrudActionType;
  readonly payload: T;
}

export interface HistoryAction<T = unknown> extends BaseAction {
  readonly type: HistoryActionType;
  readonly payload: T;
}

export interface FocusAction<T = unknown> extends BaseAction {
  readonly type: FocusActionType;
  readonly payload: T;
}

export interface DraftAction<T = unknown> extends BaseAction {
  readonly type: DraftActionType;
  readonly payload: T;
}

export interface ChangeTrackingAction<T = unknown> extends BaseAction {
  readonly type: ChangeTrackingActionType;
  readonly payload: T;
}

export interface BatchAction<T = unknown> extends BaseAction {
  readonly type: BatchActionType;
  readonly payload: T;
}

export interface ContextAction<T = unknown> extends BaseAction {
  readonly type: ContextActionType;
  readonly payload: T;
}

// =============================================================================
// UNION ACTION TYPE
// =============================================================================

export type DomainAction<T = unknown> =
  | CrudAction<T>
  | HistoryAction<T>
  | FocusAction<T>
  | DraftAction<T>
  | ChangeTrackingAction<T>
  | BatchAction<T>
  | ContextAction<T>;

// =============================================================================
// ACTION SOURCE ENUM
// =============================================================================

export const ActionSource = {
  USER: 'user',
  SYSTEM: 'system',
  API: 'api',
  BATCH: 'batch',
  UNDO_REDO: 'undo_redo'
} as const;

export type ActionSource = typeof ActionSource[keyof typeof ActionSource];

// =============================================================================
// ACTION CONTEXT
// =============================================================================

export interface ActionContext {
  readonly timestamp: number;
  readonly source: ActionSource;
  readonly metadata?: ReadonlyMap<string, unknown>;
}

// =============================================================================
// TYPE-SAFE ACTION PAYLOAD MAPPING
// =============================================================================

export interface ActionPayloadMap<TItem> {
  // CRUD Action Payloads
  [CrudActionType.SET_LOADING]: boolean;
  [CrudActionType.SET_SAVING]: boolean;
  [CrudActionType.SET_CREATING]: boolean;
  [CrudActionType.SET_ERROR]: string | null;
  [CrudActionType.LOAD_ITEMS]: ReadonlyArray<TItem>;
  [CrudActionType.CREATE_ITEM]: TItem;
  [CrudActionType.READ_ITEM]: string;
  [CrudActionType.UPDATE_ITEM]: {
    readonly id: string;
    readonly updates: Partial<TItem>;
  };
  [CrudActionType.DELETE_ITEM]: string;
  [CrudActionType.CREATE_ITEMS]: ReadonlyArray<TItem>;
  [CrudActionType.UPDATE_ITEMS]: ReadonlyArray<{
    readonly id: string;
    readonly updates: Partial<TItem>;
  }>;
  [CrudActionType.DELETE_ITEMS]: ReadonlyArray<string>;
  [CrudActionType.CLEAR_GLOBAL_CONTEXT]: void;
  [CrudActionType.CLEAR_LOCAL_CONTEXT]: {
    readonly contextFilter?: string;
  };

  // History Action Payloads
  [HistoryActionType.UNDO]: void;
  [HistoryActionType.REDO]: void;
  [HistoryActionType.RECORD_CHANGE]: HistoryRecord<TItem>;
  [HistoryActionType.CLEAR_HISTORY]: void;
  [HistoryActionType.TRUNCATE_HISTORY]: number;

  // Focus Action Payloads
  [FocusActionType.SET_FOCUSED_ITEM]: string | null;
  [FocusActionType.CLEAR_FOCUSED_ITEM]: void;
  [FocusActionType.SET_FOCUSED_ITEMS]: ReadonlyArray<string>;
  [FocusActionType.TOGGLE_ITEM_FOCUS]: string;

  // Draft Action Payloads
  [DraftActionType.START_DRAFT]: {
    readonly draft: Partial<TItem>;
    readonly metadata?: Partial<DraftMetadata>;
  };
  [DraftActionType.UPDATE_DRAFT]: Partial<TItem>;
  [DraftActionType.COMMIT_DRAFT]: void;
  [DraftActionType.DISCARD_DRAFT]: void;

  // Change Tracking Action Payloads
  [ChangeTrackingActionType.CAPTURE_BASELINE]: void;
  [ChangeTrackingActionType.COMMIT_CHANGES]: void;
  [ChangeTrackingActionType.DISCARD_CHANGES]: void;
  [ChangeTrackingActionType.RESET_TO_BASELINE]: void;

  // Batch Action Payloads
  [BatchActionType.BEGIN_BATCH]: Partial<BatchMetadata>;
  [BatchActionType.END_BATCH]: void;
  [BatchActionType.EXECUTE_BATCH]: void;
  [BatchActionType.ROLLBACK_BATCH]: void;

  // Context Action Payloads
  [ContextActionType.SET_CONTEXT]: string;
  [ContextActionType.CLEAR_CONTEXT]: void;
  [ContextActionType.SWITCH_CONTEXT]: string;
  [ContextActionType.FILTER_BY_CONTEXT]: ContextFilter<TItem>;
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

export const ChangeType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  BULK_DELETE: 'bulk_delete',
  CONTEXT_CLEAR: 'context_clear'
} as const;

export type ChangeType = typeof ChangeType[keyof typeof ChangeType];

export interface HistoryRecord<TItem = unknown> {
  readonly type: ChangeType;
  readonly timestamp: number;
  readonly item?: TItem;
  readonly itemId?: string;
  readonly previousValues?: Partial<TItem>;
  readonly newValues?: Partial<TItem>;
  readonly items?: ReadonlyArray<TItem>;
  readonly contextFilter?: string;
}

export const DraftType = {
  CREATE: 'create',
  EDIT: 'edit',
  DUPLICATE: 'duplicate'
} as const;

export type DraftType = typeof DraftType[keyof typeof DraftType];

export interface DraftMetadata {
  readonly startTime: number;
  readonly draftType: DraftType;
  readonly sourceItemId?: string;
  readonly contextId: string;
}

export interface BatchMetadata {
  readonly startTime: number;
  readonly expectedOperations: number;
  readonly contextId: string;
}

export interface ContextFilter<TItem> {
  readonly predicate: (item: TItem) => boolean;
  readonly label: string;
  readonly isActive: boolean;
}

// =============================================================================
// TYPE-SAFE DISPATCH FUNCTION
// =============================================================================

export type Dispatch<TItem> = <K extends keyof ActionPayloadMap<TItem>>(
  actionType: K,
  payload: ActionPayloadMap<TItem>[K]
) => void;
