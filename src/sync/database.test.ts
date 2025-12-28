import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './database'
import type { PromptEntity, GroupEntity, PendingMutation } from './types'

// Reset database between tests
beforeEach(async () => {
  await db.prompts.clear()
  await db.promptVersions.clear()
  await db.groups.clear()
  await db.pendingMutations.clear()
  await db.syncMetadata.clear()
})

describe('Database - Prompts', () => {
  it('stores and retrieves a prompt', async () => {
    const prompt: PromptEntity = {
      id: 'prompt-1',
      type: 'prompt',
      title: 'Test Prompt',
      content: 'Test content',
      category: 'General',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.prompts.put(prompt)

    const retrieved = await db.prompts.get('prompt-1')
    expect(retrieved).toEqual(prompt)
  })

  it('getActivePrompts excludes deleted prompts', async () => {
    const active: PromptEntity = {
      id: 'active',
      type: 'prompt',
      title: 'Active',
      content: '',
      category: '',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const deleted: PromptEntity = {
      id: 'deleted',
      type: 'prompt',
      title: 'Deleted',
      content: '',
      category: '',
      isFavorite: false,
      isDeleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.prompts.bulkPut([active, deleted])

    const activePrompts = await db.getActivePrompts()
    expect(activePrompts.length).toBe(1)
    expect(activePrompts[0].id).toBe('active')
  })

  it('updates a prompt', async () => {
    const prompt: PromptEntity = {
      id: 'prompt-1',
      type: 'prompt',
      title: 'Original',
      content: '',
      category: '',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.prompts.put(prompt)
    await db.prompts.update('prompt-1', { title: 'Updated' })

    const updated = await db.prompts.get('prompt-1')
    expect(updated?.title).toBe('Updated')
  })
})

describe('Database - Groups', () => {
  it('stores and retrieves a group', async () => {
    const group: GroupEntity = {
      id: 'group-1',
      type: 'group',
      name: 'Work',
      color: 'bg-blue-500',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.groups.put(group)

    const retrieved = await db.groups.get('group-1')
    expect(retrieved).toEqual(group)
  })

  it('getActiveGroups excludes deleted groups', async () => {
    const active: GroupEntity = {
      id: 'active',
      type: 'group',
      name: 'Active',
      color: 'bg-blue-500',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const deleted: GroupEntity = {
      id: 'deleted',
      type: 'group',
      name: 'Deleted',
      color: 'bg-red-500',
      isDeleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.groups.bulkPut([active, deleted])

    const activeGroups = await db.getActiveGroups()
    expect(activeGroups.length).toBe(1)
    expect(activeGroups[0].id).toBe('active')
  })
})

describe('Database - Pending Mutations', () => {
  it('adds and retrieves pending mutations', async () => {
    const mutation: PendingMutation = {
      id: 'mutation-1',
      operation: 'create',
      entityType: 'prompt',
      entityId: 'prompt-1',
      payload: { title: 'Test' },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    }

    await db.addPendingMutation(mutation)

    const pending = await db.getPendingMutations()
    expect(pending.length).toBe(1)
    expect(pending[0]).toEqual(mutation)
  })

  it('removes pending mutation', async () => {
    const mutation: PendingMutation = {
      id: 'mutation-1',
      operation: 'create',
      entityType: 'prompt',
      entityId: 'prompt-1',
      payload: { title: 'Test' },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    }

    await db.addPendingMutation(mutation)
    await db.removePendingMutation('mutation-1')

    const pending = await db.getPendingMutations()
    expect(pending.length).toBe(0)
  })

  it('updates pending mutation', async () => {
    const mutation: PendingMutation = {
      id: 'mutation-1',
      operation: 'create',
      entityType: 'prompt',
      entityId: 'prompt-1',
      payload: { title: 'Test' },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    }

    await db.addPendingMutation(mutation)
    await db.updatePendingMutation('mutation-1', {
      retryCount: 1,
      lastError: 'Network error',
    })

    const pending = await db.getPendingMutations()
    expect(pending[0].retryCount).toBe(1)
    expect(pending[0].lastError).toBe('Network error')
  })

  it('returns mutations ordered by timestamp', async () => {
    const mutations: PendingMutation[] = [
      {
        id: 'mutation-3',
        operation: 'create',
        entityType: 'prompt',
        entityId: 'prompt-3',
        payload: {},
        timestamp: '2024-01-03T00:00:00Z',
        retryCount: 0,
      },
      {
        id: 'mutation-1',
        operation: 'create',
        entityType: 'prompt',
        entityId: 'prompt-1',
        payload: {},
        timestamp: '2024-01-01T00:00:00Z',
        retryCount: 0,
      },
      {
        id: 'mutation-2',
        operation: 'create',
        entityType: 'prompt',
        entityId: 'prompt-2',
        payload: {},
        timestamp: '2024-01-02T00:00:00Z',
        retryCount: 0,
      },
    ]

    for (const m of mutations) {
      await db.addPendingMutation(m)
    }

    const pending = await db.getPendingMutations()
    expect(pending[0].id).toBe('mutation-1')
    expect(pending[1].id).toBe('mutation-2')
    expect(pending[2].id).toBe('mutation-3')
  })
})

describe('Database - Sync Metadata', () => {
  it('stores and retrieves sync metadata', async () => {
    await db.updateSyncMetadata({
      clientId: 'client-123',
      lastSyncId: 42,
      lastSyncedAt: '2024-01-01T00:00:00Z',
    })

    const metadata = await db.getSyncMetadata()
    expect(metadata?.clientId).toBe('client-123')
    expect(metadata?.lastSyncId).toBe(42)
    expect(metadata?.lastSyncedAt).toBe('2024-01-01T00:00:00Z')
  })

  it('updates existing metadata', async () => {
    await db.updateSyncMetadata({ clientId: 'client-123', lastSyncId: 1 })
    await db.updateSyncMetadata({ lastSyncId: 10 })

    const metadata = await db.getSyncMetadata()
    expect(metadata?.clientId).toBe('client-123')
    expect(metadata?.lastSyncId).toBe(10)
  })

  it('returns null for missing metadata', async () => {
    const metadata = await db.getSyncMetadata()
    expect(metadata).toBeNull()
  })
})

describe('Database - Apply Entity Changes', () => {
  it('applies created entities', async () => {
    const changes = {
      prompts: {
        created: [{
          id: 'prompt-1',
          type: 'prompt' as const,
          title: 'New Prompt',
          content: 'Content',
          category: 'General',
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        updated: [],
        deleted: [],
      },
      promptVersions: { created: [], updated: [], deleted: [] },
      groups: {
        created: [{
          id: 'group-1',
          type: 'group' as const,
          name: 'New Group',
          color: 'bg-blue-500',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        updated: [],
        deleted: [],
      },
    }

    await db.applyEntityChanges(changes)

    const prompt = await db.prompts.get('prompt-1')
    const group = await db.groups.get('group-1')

    expect(prompt?.title).toBe('New Prompt')
    expect(group?.name).toBe('New Group')
  })

  it('applies updated entities', async () => {
    // First create entities
    await db.prompts.put({
      id: 'prompt-1',
      type: 'prompt',
      title: 'Original',
      content: '',
      category: '',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const changes = {
      prompts: {
        created: [],
        updated: [{
          id: 'prompt-1',
          type: 'prompt' as const,
          title: 'Updated',
          content: 'New content',
          category: '',
          isFavorite: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        deleted: [],
      },
      promptVersions: { created: [], updated: [], deleted: [] },
      groups: { created: [], updated: [], deleted: [] },
    }

    await db.applyEntityChanges(changes)

    const prompt = await db.prompts.get('prompt-1')
    expect(prompt?.title).toBe('Updated')
    expect(prompt?.isFavorite).toBe(true)
  })

  it('applies deleted entities', async () => {
    // First create entity
    await db.prompts.put({
      id: 'prompt-1',
      type: 'prompt',
      title: 'To Delete',
      content: '',
      category: '',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const changes = {
      prompts: {
        created: [],
        updated: [],
        deleted: ['prompt-1'],
      },
      promptVersions: { created: [], updated: [], deleted: [] },
      groups: { created: [], updated: [], deleted: [] },
    }

    await db.applyEntityChanges(changes)

    const prompt = await db.prompts.get('prompt-1')
    expect(prompt?.isDeleted).toBe(true)
  })
})

describe('Database - Prompt Versions', () => {
  it('stores and retrieves prompt versions', async () => {
    await db.promptVersions.put({
      id: 'version-1',
      type: 'prompt_version',
      promptId: 'prompt-1',
      content: 'Version 1 content',
      note: 'Initial version',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const version = await db.promptVersions.get('version-1')
    expect(version?.promptId).toBe('prompt-1')
    expect(version?.content).toBe('Version 1 content')
    expect(version?.note).toBe('Initial version')
  })

  it('filters versions by promptId', async () => {
    await db.promptVersions.bulkPut([
      {
        id: 'v1',
        type: 'prompt_version',
        promptId: 'prompt-1',
        content: 'v1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'v2',
        type: 'prompt_version',
        promptId: 'prompt-1',
        content: 'v2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'v3',
        type: 'prompt_version',
        promptId: 'prompt-2',
        content: 'v3',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    const versions = await db.promptVersions
      .where('promptId')
      .equals('prompt-1')
      .toArray()

    expect(versions.length).toBe(2)
    expect(versions.every(v => v.promptId === 'prompt-1')).toBe(true)
  })
})
