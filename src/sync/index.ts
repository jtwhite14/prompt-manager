/**
 * Sync Module Exports
 *
 * This module provides a Linear-style sync engine with:
 * - Local-first architecture (Zustand + IndexedDB)
 * - Background sync loop with delta protocol
 * - Optimistic updates with mutation queue
 * - Offline support with automatic retry
 */

// Types
export type {
  SyncableEntity,
  PromptEntity,
  PromptVersionEntity,
  GroupEntity,
  Entity,
  EntityType,
  EntityDelta,
  SyncPacket,
  SyncRequest,
  MutationOperation,
  PendingMutation,
  MutationRequest,
  MutationResponse,
  SyncStatus,
  SyncState,
  SyncEngineConfig,
  SyncEngineEvents,
  SyncMetadata,
} from './types'

// Database
export { db, PromptManagerDB } from './database'

// Store
export {
  useStore,
  selectActivePrompts,
  selectActiveGroups,
  selectFavoritePrompts,
  selectPromptsByGroup,
  selectPromptVersions,
} from './store'

// Sync Engine
export { SyncEngine, getSyncEngine, initSyncEngine } from './engine'

// React Hooks
export {
  useSyncEngine,
  useSyncState,
  useSyncStatus,
  useHasPendingMutations,
  usePrompts,
  usePrompt,
  useGroups,
  useGroup,
  usePromptActions,
  useGroupActions,
} from './hooks'
