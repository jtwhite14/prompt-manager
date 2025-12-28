/**
 * Sync Engine Types
 *
 * This module defines the core TypeScript interfaces for the Linear-style
 * sync engine architecture.
 */

// =============================================================================
// Base Entity Types
// =============================================================================

/**
 * Base interface for all syncable entities.
 * Every entity in the system must extend this interface.
 */
export interface SyncableEntity {
  id: string
  createdAt: string
  updatedAt: string
  /** Server-assigned sync ID for ordering operations */
  syncId?: number
  /** Soft delete flag - entities are never hard deleted */
  isDeleted?: boolean
}

/**
 * Prompt entity - the main content type in the app
 */
export interface PromptEntity extends SyncableEntity {
  type: 'prompt'
  title: string
  content: string
  category: string
  isFavorite: boolean
  groupId?: string
}

/**
 * Prompt Version entity - version history for prompts
 */
export interface PromptVersionEntity extends SyncableEntity {
  type: 'prompt_version'
  promptId: string
  content: string
  note?: string
}

/**
 * Group entity - for organizing prompts
 */
export interface GroupEntity extends SyncableEntity {
  type: 'group'
  name: string
  color: string
}

/**
 * Union type of all syncable entities
 */
export type Entity = PromptEntity | PromptVersionEntity | GroupEntity

/**
 * Entity type discriminator
 */
export type EntityType = Entity['type']

// =============================================================================
// Sync Protocol Types
// =============================================================================

/**
 * Delta changes for a specific entity type.
 * The server returns changes grouped by operation type.
 */
export interface EntityDelta<T extends SyncableEntity = SyncableEntity> {
  created: T[]
  updated: T[]
  deleted: string[] // Array of IDs
}

/**
 * The sync packet returned by the server.
 * Contains all changes since the client's lastSyncId.
 */
export interface SyncPacket {
  /** The new sync cursor - store this for the next sync request */
  syncId: number
  /** Timestamp when this sync packet was generated */
  timestamp: string
  /** Whether there are more changes to fetch (for pagination) */
  hasMore: boolean
  /** Delta changes grouped by entity type */
  changes: {
    prompts: EntityDelta<PromptEntity>
    promptVersions: EntityDelta<PromptVersionEntity>
    groups: EntityDelta<GroupEntity>
  }
}

/**
 * Request payload for sync endpoint
 */
export interface SyncRequest {
  /** The client's last known sync ID (cursor) */
  lastSyncId: number
  /** Optional: limit the number of changes returned */
  limit?: number
}

// =============================================================================
// Mutation Types
// =============================================================================

/**
 * Operation types for mutations
 */
export type MutationOperation = 'create' | 'update' | 'delete'

/**
 * A pending mutation waiting to be synced to the server.
 * Mutations are applied optimistically to local state immediately.
 */
export interface PendingMutation<T extends SyncableEntity = SyncableEntity> {
  /** Unique ID for this mutation (for deduplication) */
  id: string
  /** Type of operation */
  operation: MutationOperation
  /** Entity type being mutated */
  entityType: EntityType
  /** The entity ID being mutated */
  entityId: string
  /** The mutation payload (full entity for create/update, null for delete) */
  payload: Partial<T> | null
  /** Timestamp when mutation was created */
  timestamp: string
  /** Number of retry attempts */
  retryCount: number
  /** Last error message if failed */
  lastError?: string
}

/**
 * Request payload for pushing mutations to the server
 */
export interface MutationRequest {
  /** Client ID for conflict resolution */
  clientId: string
  /** Array of mutations to apply */
  mutations: PendingMutation[]
}

/**
 * Response from the server after processing mutations
 */
export interface MutationResponse {
  /** Whether all mutations were successfully applied */
  success: boolean
  /** The new sync ID after applying mutations */
  syncId: number
  /** Results for each mutation */
  results: {
    mutationId: string
    success: boolean
    /** Server-assigned entity (may differ from client version) */
    entity?: SyncableEntity
    error?: string
  }[]
  /** Any conflicts that need client resolution */
  conflicts?: {
    mutationId: string
    clientVersion: SyncableEntity
    serverVersion: SyncableEntity
  }[]
}

// =============================================================================
// Sync Engine Types
// =============================================================================

/**
 * Sync engine status
 */
export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'pushing'
  | 'error'
  | 'offline'

/**
 * Sync engine state exposed to the UI
 */
export interface SyncState {
  /** Current sync status */
  status: SyncStatus
  /** Last successful sync timestamp */
  lastSyncedAt: string | null
  /** Current sync ID cursor */
  lastSyncId: number
  /** Number of pending mutations */
  pendingMutationsCount: number
  /** Whether we're currently online */
  isOnline: boolean
  /** Last error message */
  lastError: string | null
}

/**
 * Configuration options for the sync engine
 */
export interface SyncEngineConfig {
  /** API base URL (null for offline-only mode) */
  apiBaseUrl: string | null
  /** Polling interval in milliseconds (default: 5000) */
  pollInterval: number
  /** Maximum retry attempts for failed mutations (default: 5) */
  maxRetries: number
  /** Retry backoff multiplier (default: 2) */
  retryBackoff: number
  /** Initial retry delay in ms (default: 1000) */
  initialRetryDelay: number
  /** Unique client ID for this device */
  clientId: string
}

/**
 * Events emitted by the sync engine
 */
export interface SyncEngineEvents {
  /** Fired when sync status changes */
  onStatusChange: (status: SyncStatus) => void
  /** Fired when new data is received from server */
  onSyncComplete: (packet: SyncPacket) => void
  /** Fired when a sync error occurs */
  onSyncError: (error: Error) => void
  /** Fired when mutations are successfully pushed */
  onMutationsPushed: (count: number) => void
  /** Fired when a mutation fails after all retries */
  onMutationFailed: (mutation: PendingMutation, error: Error) => void
  /** Fired when online status changes */
  onOnlineChange: (isOnline: boolean) => void
}

// =============================================================================
// Store Types
// =============================================================================

/**
 * The shape of the in-memory Zustand store
 */
export interface AppStore {
  // Data
  prompts: Map<string, PromptEntity>
  promptVersions: Map<string, PromptVersionEntity>
  groups: Map<string, GroupEntity>

  // Sync state
  syncState: SyncState

  // Actions - these apply changes optimistically
  createPrompt: (prompt: Omit<PromptEntity, 'id' | 'type' | 'createdAt' | 'updatedAt'>) => PromptEntity
  updatePrompt: (id: string, updates: Partial<PromptEntity>) => void
  deletePrompt: (id: string) => void

  createGroup: (group: Omit<GroupEntity, 'id' | 'type' | 'createdAt' | 'updatedAt'>) => GroupEntity
  updateGroup: (id: string, updates: Partial<GroupEntity>) => void
  deleteGroup: (id: string) => void

  // Internal actions (called by sync engine)
  _applyServerChanges: (packet: SyncPacket) => void
  _updateSyncState: (state: Partial<SyncState>) => void
  _hydrateFromIndexedDB: () => Promise<void>
}

// =============================================================================
// IndexedDB Schema Types
// =============================================================================

/**
 * Metadata stored in IndexedDB for sync state persistence
 */
export interface SyncMetadata {
  id: 'sync_metadata'
  lastSyncId: number
  lastSyncedAt: string | null
  clientId: string
}
