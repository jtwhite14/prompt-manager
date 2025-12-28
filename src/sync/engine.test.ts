import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SyncEngine, initSyncEngine, getSyncEngine } from './engine'
import { useStore } from './store'
import { db } from './database'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Reset before each test
beforeEach(async () => {
  vi.clearAllMocks()

  // Clear IndexedDB
  await db.prompts.clear()
  await db.promptVersions.clear()
  await db.groups.clear()
  await db.pendingMutations.clear()
  await db.syncMetadata.clear()

  // Reset store state
  useStore.setState({
    prompts: new Map(),
    promptVersions: new Map(),
    groups: new Map(),
    isHydrated: true,
    syncState: {
      status: 'idle',
      lastSyncedAt: null,
      lastSyncId: 0,
      pendingMutationsCount: 0,
      isOnline: true,
      lastError: null,
    },
  })
})

afterEach(() => {
  // Clean up sync engine
  try {
    getSyncEngine().destroy()
  } catch {
    // Ignore if not initialized
  }
})

describe('SyncEngine - Initialization', () => {
  it('creates a new sync engine with default config', () => {
    const engine = new SyncEngine()
    const state = engine.getState()

    expect(state.isRunning).toBe(false)
    expect(state.isPushing).toBe(false)
    expect(state.config.apiBaseUrl).toBe('http://localhost:3001/api')
    expect(state.config.pollInterval).toBe(5000)
  })

  it('creates a sync engine with custom config', () => {
    const engine = new SyncEngine({
      apiBaseUrl: 'http://custom.api/v1',
      pollInterval: 10000,
    })

    const state = engine.getState()
    expect(state.config.apiBaseUrl).toBe('http://custom.api/v1')
    expect(state.config.pollInterval).toBe(10000)
  })

  it('initializes and assigns client ID', async () => {
    const engine = new SyncEngine()
    await engine.init()

    const state = engine.getState()
    expect(state.config.clientId).toBeDefined()
    expect(state.config.clientId.length).toBeGreaterThan(0)
  })

  it('reuses existing client ID from metadata', async () => {
    const existingClientId = 'existing-client-123'
    await db.updateSyncMetadata({ clientId: existingClientId })

    const engine = new SyncEngine()
    await engine.init()

    expect(engine.getState().config.clientId).toBe(existingClientId)
  })
})

describe('SyncEngine - Sync Operations', () => {
  it('calls sync endpoint with lastSyncId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        syncId: 5,
        timestamp: new Date().toISOString(),
        hasMore: false,
        changes: {
          prompts: { created: [], updated: [], deleted: [] },
          promptVersions: { created: [], updated: [], deleted: [] },
          groups: { created: [], updated: [], deleted: [] },
        },
      }),
    })

    // Set initial sync state
    useStore.setState({
      ...useStore.getState(),
      syncState: { ...useStore.getState().syncState, lastSyncId: 3 },
    })

    const engine = new SyncEngine()
    await engine.init()
    await engine.sync()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/sync',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSyncId: 3, limit: 100 }),
      })
    )
  })

  it('applies server changes after successful sync', async () => {
    const serverPrompt = {
      id: 'server-prompt-1',
      type: 'prompt',
      title: 'From Server',
      content: 'Server content',
      category: 'General',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncId: 1,
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        syncId: 1,
        timestamp: new Date().toISOString(),
        hasMore: false,
        changes: {
          prompts: { created: [serverPrompt], updated: [], deleted: [] },
          promptVersions: { created: [], updated: [], deleted: [] },
          groups: { created: [], updated: [], deleted: [] },
        },
      }),
    })

    const engine = new SyncEngine()
    await engine.init()
    await engine.sync()

    const state = useStore.getState()
    expect(state.prompts.get('server-prompt-1')?.title).toBe('From Server')
    expect(state.syncState.lastSyncId).toBe(1)
  })

  it('updates status during sync', async () => {
    let statusDuringSync: string | null = null

    mockFetch.mockImplementationOnce(async () => {
      statusDuringSync = useStore.getState().syncState.status
      return {
        ok: true,
        json: () => Promise.resolve({
          syncId: 1,
          timestamp: new Date().toISOString(),
          hasMore: false,
          changes: {
            prompts: { created: [], updated: [], deleted: [] },
            promptVersions: { created: [], updated: [], deleted: [] },
            groups: { created: [], updated: [], deleted: [] },
          },
        }),
      }
    })

    const engine = new SyncEngine()
    await engine.init()
    await engine.sync()

    expect(statusDuringSync).toBe('syncing')
    expect(useStore.getState().syncState.status).toBe('idle')
  })

  it('handles sync errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const engine = new SyncEngine()
    await engine.init()
    await engine.sync()

    const state = useStore.getState()
    expect(state.syncState.status).toBe('error')
    expect(state.syncState.lastError).toBe('Network error')
  })

  it('handles non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const engine = new SyncEngine()
    await engine.init()
    await engine.sync()

    expect(useStore.getState().syncState.status).toBe('error')
  })
})

describe('SyncEngine - Push Operations', () => {
  it('pushes pending mutations to server', async () => {
    // Add a pending mutation
    await db.addPendingMutation({
      id: 'mutation-1',
      operation: 'create',
      entityType: 'prompt',
      entityId: 'prompt-1',
      payload: { title: 'Test', content: 'Content' },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        syncId: 10,
        results: [{ mutationId: 'mutation-1', success: true }],
      }),
    })

    const engine = new SyncEngine()
    await engine.init()
    await engine.push()

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/mutations',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    // Verify mutation was removed from queue
    const pending = await db.getPendingMutations()
    expect(pending.length).toBe(0)
  })

  it('does not push if no pending mutations', async () => {
    const engine = new SyncEngine()
    await engine.init()
    await engine.push()

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handles push errors with retry', async () => {
    await db.addPendingMutation({
      id: 'mutation-1',
      operation: 'create',
      entityType: 'prompt',
      entityId: 'prompt-1',
      payload: { title: 'Test' },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    })

    mockFetch.mockRejectedValueOnce(new Error('Push failed'))

    const engine = new SyncEngine()
    await engine.init()
    await engine.push()

    // Mutation should still be in queue
    const pending = await db.getPendingMutations()
    expect(pending.length).toBe(1)
    expect(useStore.getState().syncState.status).toBe('error')
  })

  it('removes mutation after max retries exceeded', async () => {
    await db.addPendingMutation({
      id: 'mutation-1',
      operation: 'create',
      entityType: 'prompt',
      entityId: 'prompt-1',
      payload: { title: 'Test' },
      timestamp: new Date().toISOString(),
      retryCount: 4, // Already retried 4 times
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        syncId: 10,
        results: [{ mutationId: 'mutation-1', success: false, error: 'Server error' }],
      }),
    })

    const onMutationFailed = vi.fn()
    const engine = new SyncEngine({}, { onMutationFailed })
    await engine.init()
    await engine.push()

    // Mutation should be removed after max retries
    const pending = await db.getPendingMutations()
    expect(pending.length).toBe(0)
    expect(onMutationFailed).toHaveBeenCalled()
  })
})

describe('SyncEngine - Lifecycle', () => {
  it('starts and stops sync loop', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        syncId: 1,
        timestamp: new Date().toISOString(),
        hasMore: false,
        changes: {
          prompts: { created: [], updated: [], deleted: [] },
          promptVersions: { created: [], updated: [], deleted: [] },
          groups: { created: [], updated: [], deleted: [] },
        },
      }),
    })

    const engine = new SyncEngine({ pollInterval: 100 })
    await engine.init()

    engine.start()
    expect(engine.getState().isRunning).toBe(true)

    engine.stop()
    expect(engine.getState().isRunning).toBe(false)
  })

  it('forceSync triggers immediate sync', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        syncId: 1,
        timestamp: new Date().toISOString(),
        hasMore: false,
        changes: {
          prompts: { created: [], updated: [], deleted: [] },
          promptVersions: { created: [], updated: [], deleted: [] },
          groups: { created: [], updated: [], deleted: [] },
        },
      }),
    })

    const engine = new SyncEngine()
    await engine.init()

    engine.forceSync()

    // Wait a tick for async sync to start
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(mockFetch).toHaveBeenCalled()
  })
})

describe('SyncEngine - Singleton', () => {
  it('initSyncEngine creates new instance', () => {
    const engine1 = initSyncEngine({ pollInterval: 1000 })
    const engine2 = getSyncEngine()

    expect(engine1).toBe(engine2)
    expect(engine1.getState().config.pollInterval).toBe(1000)
  })

  it('initSyncEngine destroys previous instance', () => {
    const engine1 = initSyncEngine({ pollInterval: 1000 })
    const destroySpy = vi.spyOn(engine1, 'destroy')

    initSyncEngine({ pollInterval: 2000 })

    expect(destroySpy).toHaveBeenCalled()
  })
})

describe('SyncEngine - Event Callbacks', () => {
  it('calls onSyncComplete callback', async () => {
    const onSyncComplete = vi.fn()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        syncId: 1,
        timestamp: new Date().toISOString(),
        hasMore: false,
        changes: {
          prompts: { created: [], updated: [], deleted: [] },
          promptVersions: { created: [], updated: [], deleted: [] },
          groups: { created: [], updated: [], deleted: [] },
        },
      }),
    })

    const engine = new SyncEngine({}, { onSyncComplete })
    await engine.init()
    await engine.sync()

    expect(onSyncComplete).toHaveBeenCalledWith(expect.objectContaining({
      syncId: 1,
    }))
  })

  it('calls onSyncError callback', async () => {
    const onSyncError = vi.fn()

    mockFetch.mockRejectedValueOnce(new Error('Sync failed'))

    const engine = new SyncEngine({}, { onSyncError })
    await engine.init()
    await engine.sync()

    expect(onSyncError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('calls onStatusChange callback', async () => {
    const onStatusChange = vi.fn()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        syncId: 1,
        timestamp: new Date().toISOString(),
        hasMore: false,
        changes: {
          prompts: { created: [], updated: [], deleted: [] },
          promptVersions: { created: [], updated: [], deleted: [] },
          groups: { created: [], updated: [], deleted: [] },
        },
      }),
    })

    const engine = new SyncEngine({}, { onStatusChange })
    await engine.init()
    await engine.sync()

    expect(onStatusChange).toHaveBeenCalledWith('syncing')
    expect(onStatusChange).toHaveBeenCalledWith('idle')
  })
})
