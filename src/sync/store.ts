/**
 * Zustand Store
 *
 * The in-memory store that the UI reads from. This store:
 * 1. Hydrates from IndexedDB on startup
 * 2. Receives updates from the sync engine
 * 3. Applies optimistic updates immediately
 * 4. Queues mutations for sync
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import { db } from './database'
import type {
  PromptEntity,
  PromptVersionEntity,
  GroupEntity,
  SyncState,
  SyncPacket,
  PendingMutation,
  EntityType,
} from './types'

// =============================================================================
// Store State Interface
// =============================================================================

interface StoreState {
  // Data - using Maps for O(1) lookups
  prompts: Map<string, PromptEntity>
  promptVersions: Map<string, PromptVersionEntity>
  groups: Map<string, GroupEntity>

  // Sync state
  syncState: SyncState

  // Hydration flag
  isHydrated: boolean
}

interface StoreActions {
  // Prompt actions
  createPrompt: (
    data: Omit<PromptEntity, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'syncId'>
  ) => PromptEntity
  updatePrompt: (id: string, updates: Partial<PromptEntity>) => void
  deletePrompt: (id: string) => void

  // Prompt version actions
  createPromptVersion: (
    data: Omit<PromptVersionEntity, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'syncId'>
  ) => PromptVersionEntity

  // Group actions
  createGroup: (
    data: Omit<GroupEntity, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'syncId'>
  ) => GroupEntity
  updateGroup: (id: string, updates: Partial<GroupEntity>) => void
  deleteGroup: (id: string) => void

  // Internal actions (called by sync engine)
  _applyServerChanges: (packet: SyncPacket) => void
  _updateSyncState: (state: Partial<SyncState>) => void
  _hydrateFromIndexedDB: () => Promise<void>
  _removePendingMutation: (mutationId: string) => void
}

type Store = StoreState & StoreActions

// =============================================================================
// Helper Functions
// =============================================================================

const now = () => new Date().toISOString()

/**
 * Queue a mutation for sync and persist to IndexedDB
 */
async function queueMutation<T extends { id: string }>(
  operation: 'create' | 'update' | 'delete',
  entityType: EntityType,
  entityId: string,
  payload: Partial<T> | null
): Promise<void> {
  const mutation: PendingMutation = {
    id: uuid(),
    operation,
    entityType,
    entityId,
    payload,
    timestamp: now(),
    retryCount: 0,
  }

  await db.addPendingMutation(mutation)

  // Update pending count in store
  useStore.getState()._updateSyncState({
    pendingMutationsCount: useStore.getState().syncState.pendingMutationsCount + 1,
  })
}

// =============================================================================
// Store Definition
// =============================================================================

export const useStore = create<Store>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    prompts: new Map(),
    promptVersions: new Map(),
    groups: new Map(),
    isHydrated: false,

    syncState: {
      status: 'idle',
      lastSyncedAt: null,
      lastSyncId: 0,
      pendingMutationsCount: 0,
      isOnline: navigator.onLine,
      lastError: null,
    },

    // =========================================================================
    // Prompt Actions
    // =========================================================================

    createPrompt: (data) => {
      const prompt: PromptEntity = {
        ...data,
        id: uuid(),
        type: 'prompt',
        createdAt: now(),
        updatedAt: now(),
        isDeleted: false,
      }

      // Optimistic update
      set((state) => {
        const newPrompts = new Map(state.prompts)
        newPrompts.set(prompt.id, prompt)
        return { prompts: newPrompts }
      })

      // Persist to IndexedDB
      db.prompts.put(prompt)

      // Queue mutation for sync
      queueMutation('create', 'prompt', prompt.id, prompt)

      return prompt
    },

    updatePrompt: (id, updates) => {
      const existing = get().prompts.get(id)
      if (!existing) return

      const updated: PromptEntity = {
        ...existing,
        ...updates,
        updatedAt: now(),
      }

      // Optimistic update
      set((state) => {
        const newPrompts = new Map(state.prompts)
        newPrompts.set(id, updated)
        return { prompts: newPrompts }
      })

      // Persist to IndexedDB
      db.prompts.put(updated)

      // Queue mutation for sync
      queueMutation('update', 'prompt', id, updates)
    },

    deletePrompt: (id) => {
      // Soft delete - mark as deleted
      set((state) => {
        const newPrompts = new Map(state.prompts)
        const existing = newPrompts.get(id)
        if (existing) {
          newPrompts.set(id, { ...existing, isDeleted: true, updatedAt: now() })
        }
        return { prompts: newPrompts }
      })

      // Persist to IndexedDB
      db.prompts.update(id, { isDeleted: true, updatedAt: now() })

      // Queue mutation for sync
      queueMutation('delete', 'prompt', id, null)
    },

    // =========================================================================
    // Prompt Version Actions
    // =========================================================================

    createPromptVersion: (data) => {
      const version: PromptVersionEntity = {
        ...data,
        id: uuid(),
        type: 'prompt_version',
        createdAt: now(),
        updatedAt: now(),
        isDeleted: false,
      }

      // Optimistic update
      set((state) => {
        const newVersions = new Map(state.promptVersions)
        newVersions.set(version.id, version)
        return { promptVersions: newVersions }
      })

      // Persist to IndexedDB
      db.promptVersions.put(version)

      // Queue mutation for sync
      queueMutation('create', 'prompt_version', version.id, version)

      return version
    },

    // =========================================================================
    // Group Actions
    // =========================================================================

    createGroup: (data) => {
      const group: GroupEntity = {
        ...data,
        id: uuid(),
        type: 'group',
        createdAt: now(),
        updatedAt: now(),
        isDeleted: false,
      }

      // Optimistic update
      set((state) => {
        const newGroups = new Map(state.groups)
        newGroups.set(group.id, group)
        return { groups: newGroups }
      })

      // Persist to IndexedDB
      db.groups.put(group)

      // Queue mutation for sync
      queueMutation('create', 'group', group.id, group)

      return group
    },

    updateGroup: (id, updates) => {
      const existing = get().groups.get(id)
      if (!existing) return

      const updated: GroupEntity = {
        ...existing,
        ...updates,
        updatedAt: now(),
      }

      // Optimistic update
      set((state) => {
        const newGroups = new Map(state.groups)
        newGroups.set(id, updated)
        return { groups: newGroups }
      })

      // Persist to IndexedDB
      db.groups.put(updated)

      // Queue mutation for sync
      queueMutation('update', 'group', id, updates)
    },

    deleteGroup: (id) => {
      // Soft delete
      set((state) => {
        const newGroups = new Map(state.groups)
        const existing = newGroups.get(id)
        if (existing) {
          newGroups.set(id, { ...existing, isDeleted: true, updatedAt: now() })
        }
        return { groups: newGroups }
      })

      // Persist to IndexedDB
      db.groups.update(id, { isDeleted: true, updatedAt: now() })

      // Queue mutation for sync
      queueMutation('delete', 'group', id, null)
    },

    // =========================================================================
    // Internal Actions (called by sync engine)
    // =========================================================================

    _applyServerChanges: (packet) => {
      set((state) => {
        const newPrompts = new Map(state.prompts)
        const newVersions = new Map(state.promptVersions)
        const newGroups = new Map(state.groups)

        // Apply prompt changes
        packet.changes.prompts.created.forEach((p) => newPrompts.set(p.id, p))
        packet.changes.prompts.updated.forEach((p) => newPrompts.set(p.id, p))
        packet.changes.prompts.deleted.forEach((id) => {
          const existing = newPrompts.get(id)
          if (existing) {
            newPrompts.set(id, { ...existing, isDeleted: true })
          }
        })

        // Apply prompt version changes
        packet.changes.promptVersions.created.forEach((v) => newVersions.set(v.id, v))
        packet.changes.promptVersions.updated.forEach((v) => newVersions.set(v.id, v))
        packet.changes.promptVersions.deleted.forEach((id) => {
          const existing = newVersions.get(id)
          if (existing) {
            newVersions.set(id, { ...existing, isDeleted: true })
          }
        })

        // Apply group changes
        packet.changes.groups.created.forEach((g) => newGroups.set(g.id, g))
        packet.changes.groups.updated.forEach((g) => newGroups.set(g.id, g))
        packet.changes.groups.deleted.forEach((id) => {
          const existing = newGroups.get(id)
          if (existing) {
            newGroups.set(id, { ...existing, isDeleted: true })
          }
        })

        return {
          prompts: newPrompts,
          promptVersions: newVersions,
          groups: newGroups,
          syncState: {
            ...state.syncState,
            lastSyncId: packet.syncId,
            lastSyncedAt: packet.timestamp,
          },
        }
      })

      // Also persist to IndexedDB
      db.applyEntityChanges(packet.changes)
      db.updateSyncMetadata({
        lastSyncId: packet.syncId,
        lastSyncedAt: packet.timestamp,
      })
    },

    _updateSyncState: (updates) => {
      set((state) => ({
        syncState: { ...state.syncState, ...updates },
      }))
    },

    _hydrateFromIndexedDB: async () => {
      try {
        // Load all data from IndexedDB
        const [prompts, versions, groups, metadata, pendingMutations] = await Promise.all([
          db.getActivePrompts(),
          db.promptVersions.filter((v) => !v.isDeleted).toArray(),
          db.getActiveGroups(),
          db.getSyncMetadata(),
          db.getPendingMutations(),
        ])

        // Convert arrays to Maps
        const promptsMap = new Map(prompts.map((p) => [p.id, p]))
        const versionsMap = new Map(versions.map((v) => [v.id, v]))
        const groupsMap = new Map(groups.map((g) => [g.id, g]))

        set({
          prompts: promptsMap,
          promptVersions: versionsMap,
          groups: groupsMap,
          isHydrated: true,
          syncState: {
            status: 'idle',
            lastSyncId: metadata?.lastSyncId ?? 0,
            lastSyncedAt: metadata?.lastSyncedAt ?? null,
            pendingMutationsCount: pendingMutations.length,
            isOnline: navigator.onLine,
            lastError: null,
          },
        })

        console.log('[Store] Hydrated from IndexedDB:', {
          prompts: prompts.length,
          versions: versions.length,
          groups: groups.length,
          pendingMutations: pendingMutations.length,
        })
      } catch (error) {
        console.error('[Store] Failed to hydrate from IndexedDB:', error)
        set({ isHydrated: true }) // Still mark as hydrated so app can function
      }
    },

    _removePendingMutation: (mutationId) => {
      db.removePendingMutation(mutationId)
      set((state) => ({
        syncState: {
          ...state.syncState,
          pendingMutationsCount: Math.max(0, state.syncState.pendingMutationsCount - 1),
        },
      }))
    },
  }))
)

// =============================================================================
// Selectors (for efficient subscriptions)
// =============================================================================

/**
 * Get all active (non-deleted) prompts as an array
 */
export const selectActivePrompts = (state: Store): PromptEntity[] =>
  Array.from(state.prompts.values()).filter((p) => !p.isDeleted)

/**
 * Get all active groups as an array
 */
export const selectActiveGroups = (state: Store): GroupEntity[] =>
  Array.from(state.groups.values()).filter((g) => !g.isDeleted)

/**
 * Get favorite prompts
 */
export const selectFavoritePrompts = (state: Store): PromptEntity[] =>
  Array.from(state.prompts.values()).filter((p) => !p.isDeleted && p.isFavorite)

/**
 * Get prompts by group ID
 */
export const selectPromptsByGroup = (state: Store, groupId: string): PromptEntity[] =>
  Array.from(state.prompts.values()).filter((p) => !p.isDeleted && p.groupId === groupId)

/**
 * Get versions for a specific prompt
 */
export const selectPromptVersions = (state: Store, promptId: string): PromptVersionEntity[] =>
  Array.from(state.promptVersions.values())
    .filter((v) => !v.isDeleted && v.promptId === promptId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
