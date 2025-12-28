/**
 * Sync Engine
 *
 * The core synchronization engine that:
 * 1. Polls the server for changes (pull)
 * 2. Pushes pending mutations to the server (push)
 * 3. Handles offline/online transitions
 * 4. Manages retry logic with exponential backoff
 */

import { db } from './database'
import { useStore } from './store'
import type {
  SyncEngineConfig,
  SyncEngineEvents,
  SyncStatus,
  SyncPacket,
  SyncRequest,
  PendingMutation,
  MutationRequest,
  MutationResponse,
} from './types'

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: SyncEngineConfig = {
  apiBaseUrl: 'http://localhost:3001/api',
  pollInterval: 5000, // 5 seconds
  maxRetries: 5,
  retryBackoff: 2,
  initialRetryDelay: 1000, // 1 second
  clientId: '', // Will be set on init
}

// =============================================================================
// Sync Engine Class
// =============================================================================

export class SyncEngine {
  private config: SyncEngineConfig
  private events: Partial<SyncEngineEvents>
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private pushTimer: ReturnType<typeof setTimeout> | null = null
  private isRunning = false
  private isPushing = false

  constructor(config?: Partial<SyncEngineConfig>, events?: Partial<SyncEngineEvents>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.events = events ?? {}
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Initialize the sync engine
   */
  async init(): Promise<void> {
    // Get or create client ID
    const metadata = await db.getSyncMetadata()
    if (metadata?.clientId) {
      this.config.clientId = metadata.clientId
    } else {
      this.config.clientId = crypto.randomUUID()
      await db.updateSyncMetadata({ clientId: this.config.clientId })
    }

    // Set up online/offline listeners
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Update initial online state
    this.updateStatus(navigator.onLine ? 'idle' : 'offline')

    console.log('[SyncEngine] Initialized with client ID:', this.config.clientId)
  }

  /**
   * Start the sync loop
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    console.log('[SyncEngine] Starting sync loop')

    // Initial sync
    this.sync()

    // Start polling
    this.pollTimer = setInterval(() => {
      if (navigator.onLine) {
        this.sync()
      }
    }, this.config.pollInterval)

    // Start push loop
    this.schedulePush()
  }

  /**
   * Stop the sync loop
   */
  stop(): void {
    this.isRunning = false

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    if (this.pushTimer) {
      clearTimeout(this.pushTimer)
      this.pushTimer = null
    }

    console.log('[SyncEngine] Stopped')
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    this.stop()
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  /**
   * Pull changes from the server
   */
  async sync(): Promise<void> {
    if (!navigator.onLine) {
      this.updateStatus('offline')
      return
    }

    const store = useStore.getState()
    const { lastSyncId } = store.syncState

    this.updateStatus('syncing')

    try {
      const request: SyncRequest = {
        lastSyncId,
        limit: 100, // Batch size
      }

      const response = await fetch(`${this.config.apiBaseUrl}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`)
      }

      const packet: SyncPacket = await response.json()

      // Apply changes to store (which also persists to IndexedDB)
      store._applyServerChanges(packet)

      this.updateStatus('idle')
      this.events.onSyncComplete?.(packet)

      console.log('[SyncEngine] Sync complete:', {
        syncId: packet.syncId,
        changes: {
          prompts:
            packet.changes.prompts.created.length +
            packet.changes.prompts.updated.length +
            packet.changes.prompts.deleted.length,
          groups:
            packet.changes.groups.created.length +
            packet.changes.groups.updated.length +
            packet.changes.groups.deleted.length,
        },
      })

      // If there are more changes, sync again
      if (packet.hasMore) {
        setTimeout(() => this.sync(), 100)
      }
    } catch (error) {
      console.error('[SyncEngine] Sync error:', error)
      this.updateStatus('error')
      this.events.onSyncError?.(error as Error)
      useStore.getState()._updateSyncState({
        lastError: (error as Error).message,
      })
    }
  }

  /**
   * Push pending mutations to the server
   */
  async push(): Promise<void> {
    if (this.isPushing || !navigator.onLine) return

    const pendingMutations = await db.getPendingMutations()
    if (pendingMutations.length === 0) return

    this.isPushing = true
    this.updateStatus('pushing')

    try {
      // Take a batch of mutations
      const batch = pendingMutations.slice(0, 10)

      const request: MutationRequest = {
        clientId: this.config.clientId,
        mutations: batch,
      }

      const response = await fetch(`${this.config.apiBaseUrl}/mutations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`Push failed: ${response.status} ${response.statusText}`)
      }

      const result: MutationResponse = await response.json()

      // Process results
      let successCount = 0
      for (const mutationResult of result.results) {
        if (mutationResult.success) {
          // Remove successful mutation from queue
          await db.removePendingMutation(mutationResult.mutationId)
          useStore.getState()._removePendingMutation(mutationResult.mutationId)
          successCount++
        } else {
          // Handle failed mutation
          const mutation = batch.find((m) => m.id === mutationResult.mutationId)
          if (mutation) {
            await this.handleFailedMutation(mutation, mutationResult.error || 'Unknown error')
          }
        }
      }

      this.updateStatus('idle')

      if (successCount > 0) {
        this.events.onMutationsPushed?.(successCount)
        console.log('[SyncEngine] Pushed mutations:', successCount)
      }

      // Update sync ID if provided
      if (result.syncId) {
        useStore.getState()._updateSyncState({ lastSyncId: result.syncId })
      }

      // If there are more pending mutations, push again
      const remaining = await db.getPendingMutations()
      if (remaining.length > 0) {
        this.schedulePush(100)
      }
    } catch (error) {
      console.error('[SyncEngine] Push error:', error)
      this.updateStatus('error')

      // Retry with backoff
      this.schedulePush(this.config.initialRetryDelay)
    } finally {
      this.isPushing = false
    }
  }

  /**
   * Handle a failed mutation (retry logic)
   */
  private async handleFailedMutation(
    mutation: PendingMutation,
    error: string
  ): Promise<void> {
    const newRetryCount = mutation.retryCount + 1

    if (newRetryCount >= this.config.maxRetries) {
      // Max retries exceeded - remove from queue and notify
      await db.removePendingMutation(mutation.id)
      useStore.getState()._removePendingMutation(mutation.id)
      this.events.onMutationFailed?.(mutation, new Error(error))
      console.error('[SyncEngine] Mutation failed permanently:', mutation.id, error)
    } else {
      // Update retry count and error
      await db.updatePendingMutation(mutation.id, {
        retryCount: newRetryCount,
        lastError: error,
      })
      console.warn('[SyncEngine] Mutation retry scheduled:', mutation.id, `attempt ${newRetryCount}`)
    }
  }

  /**
   * Schedule the next push attempt
   */
  private schedulePush(delay?: number): void {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer)
    }

    const pushDelay = delay ?? this.config.pollInterval

    this.pushTimer = setTimeout(() => {
      if (this.isRunning && navigator.onLine) {
        this.push()
      }
    }, pushDelay)
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  private handleOnline = (): void => {
    console.log('[SyncEngine] Online')
    this.updateStatus('idle')
    this.events.onOnlineChange?.(true)
    useStore.getState()._updateSyncState({ isOnline: true })

    // Immediately sync and push
    this.sync()
    this.push()
  }

  private handleOffline = (): void => {
    console.log('[SyncEngine] Offline')
    this.updateStatus('offline')
    this.events.onOnlineChange?.(false)
    useStore.getState()._updateSyncState({ isOnline: false })
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private updateStatus(status: SyncStatus): void {
    useStore.getState()._updateSyncState({ status })
    this.events.onStatusChange?.(status)
  }

  /**
   * Force an immediate sync (useful for manual refresh)
   */
  forceSync(): void {
    this.sync()
  }

  /**
   * Force push pending mutations (useful for before logout)
   */
  forcePush(): Promise<void> {
    return this.push()
  }

  /**
   * Get current sync state
   */
  getState(): {
    isRunning: boolean
    isPushing: boolean
    config: SyncEngineConfig
  } {
    return {
      isRunning: this.isRunning,
      isPushing: this.isPushing,
      config: this.config,
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let syncEngine: SyncEngine | null = null

export function getSyncEngine(): SyncEngine {
  if (!syncEngine) {
    syncEngine = new SyncEngine()
  }
  return syncEngine
}

export function initSyncEngine(
  config?: Partial<SyncEngineConfig>,
  events?: Partial<SyncEngineEvents>
): SyncEngine {
  if (syncEngine) {
    syncEngine.destroy()
  }
  syncEngine = new SyncEngine(config, events)
  return syncEngine
}
