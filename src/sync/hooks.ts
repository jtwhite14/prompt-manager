/**
 * React Hooks for Sync Engine Integration
 *
 * These hooks provide easy integration with React components.
 */

import { useEffect, useCallback, useRef } from 'react'
import { useStore, selectActivePrompts, selectActiveGroups } from './store'
import { initSyncEngine, getSyncEngine } from './engine'
import type { SyncEngineConfig, SyncEngineEvents, SyncStatus } from './types'

/**
 * Initialize and manage the sync engine lifecycle.
 * Call this once at the app root level.
 */
export function useSyncEngine(
  config?: Partial<SyncEngineConfig>,
  events?: Partial<SyncEngineEvents>
) {
  const isInitialized = useRef(false)
  const isHydrated = useStore((state) => state.isHydrated)
  const hydrateFromIndexedDB = useStore((state) => state._hydrateFromIndexedDB)

  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    async function init() {
      try {
        // First, hydrate the store from IndexedDB
        await hydrateFromIndexedDB()

        // Then initialize and start the sync engine
        const engine = initSyncEngine(config, events)
        await engine.init()
        engine.start()

        console.log('[useSyncEngine] Initialized and started')
      } catch (error) {
        console.error('[useSyncEngine] Failed to initialize:', error)
        // Ensure the app can still function by marking as hydrated
        useStore.setState({ isHydrated: true })
      }
    }

    init()

    // Cleanup on unmount
    return () => {
      try {
        const engine = getSyncEngine()
        engine.destroy()
        console.log('[useSyncEngine] Destroyed')
      } catch {
        // Ignore cleanup errors
      }
    }
  }, []) // Empty deps - only run once

  // Return sync controls
  const forceSync = useCallback(() => {
    getSyncEngine().forceSync()
  }, [])

  const forcePush = useCallback(() => {
    return getSyncEngine().forcePush()
  }, [])

  return {
    isHydrated,
    forceSync,
    forcePush,
  }
}

/**
 * Subscribe to sync state changes
 */
export function useSyncState() {
  return useStore((state) => state.syncState)
}

/**
 * Get sync status (shorthand)
 */
export function useSyncStatus(): SyncStatus {
  return useStore((state) => state.syncState.status)
}

/**
 * Check if there are pending mutations
 */
export function useHasPendingMutations(): boolean {
  return useStore((state) => state.syncState.pendingMutationsCount > 0)
}

/**
 * Get all active prompts (non-deleted)
 */
export function usePrompts() {
  return useStore(selectActivePrompts)
}

/**
 * Get a single prompt by ID
 */
export function usePrompt(id: string) {
  return useStore((state) => {
    const prompt = state.prompts.get(id)
    return prompt && !prompt.isDeleted ? prompt : null
  })
}

/**
 * Get all active groups (non-deleted)
 */
export function useGroups() {
  return useStore(selectActiveGroups)
}

/**
 * Get a single group by ID
 */
export function useGroup(id: string) {
  return useStore((state) => {
    const group = state.groups.get(id)
    return group && !group.isDeleted ? group : null
  })
}

/**
 * Get prompt mutation actions
 */
export function usePromptActions() {
  const createPrompt = useStore((state) => state.createPrompt)
  const updatePrompt = useStore((state) => state.updatePrompt)
  const deletePrompt = useStore((state) => state.deletePrompt)

  return { createPrompt, updatePrompt, deletePrompt }
}

/**
 * Get group mutation actions
 */
export function useGroupActions() {
  const createGroup = useStore((state) => state.createGroup)
  const updateGroup = useStore((state) => state.updateGroup)
  const deleteGroup = useStore((state) => state.deleteGroup)

  return { createGroup, updateGroup, deleteGroup }
}
