import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStore, selectActivePrompts, selectActiveGroups, selectFavoritePrompts, selectPromptsByGroup } from './store'
import { db } from './database'

// Reset store between tests
beforeEach(async () => {
  // Clear IndexedDB
  await db.prompts.clear()
  await db.promptVersions.clear()
  await db.groups.clear()
  await db.pendingMutations.clear()

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

describe('Store - Prompt Operations', () => {
  it('creates a prompt with correct structure', () => {
    const { createPrompt } = useStore.getState()

    const prompt = createPrompt({
      title: 'Test Prompt',
      content: 'This is test content',
      category: 'General',
      isFavorite: false,
    })

    expect(prompt.id).toBeDefined()
    expect(prompt.title).toBe('Test Prompt')
    expect(prompt.content).toBe('This is test content')
    expect(prompt.category).toBe('General')
    expect(prompt.type).toBe('prompt')
    expect(prompt.isDeleted).toBe(false)
    expect(prompt.createdAt).toBeDefined()
    expect(prompt.updatedAt).toBeDefined()
  })

  it('adds created prompt to store', () => {
    const { createPrompt } = useStore.getState()

    const prompt = createPrompt({
      title: 'Test Prompt',
      content: 'Content',
      category: 'General',
      isFavorite: false,
    })

    const state = useStore.getState()
    expect(state.prompts.get(prompt.id)).toEqual(prompt)
  })

  it('updates a prompt correctly', () => {
    const { createPrompt, updatePrompt } = useStore.getState()

    const prompt = createPrompt({
      title: 'Original Title',
      content: 'Original Content',
      category: 'General',
      isFavorite: false,
    })

    updatePrompt(prompt.id, { title: 'Updated Title' })

    const updated = useStore.getState().prompts.get(prompt.id)
    expect(updated?.title).toBe('Updated Title')
    expect(updated?.content).toBe('Original Content')
  })

  it('soft deletes a prompt', () => {
    const { createPrompt, deletePrompt } = useStore.getState()

    const prompt = createPrompt({
      title: 'To Delete',
      content: 'Content',
      category: 'General',
      isFavorite: false,
    })

    deletePrompt(prompt.id)

    const deleted = useStore.getState().prompts.get(prompt.id)
    expect(deleted?.isDeleted).toBe(true)
  })

  it('handles updating non-existent prompt gracefully', () => {
    const { updatePrompt } = useStore.getState()

    // Should not throw
    updatePrompt('non-existent-id', { title: 'New Title' })

    expect(useStore.getState().prompts.size).toBe(0)
  })
})

describe('Store - Group Operations', () => {
  it('creates a group with correct structure', () => {
    const { createGroup } = useStore.getState()

    const group = createGroup({
      name: 'Work',
      color: 'bg-blue-500',
    })

    expect(group.id).toBeDefined()
    expect(group.name).toBe('Work')
    expect(group.color).toBe('bg-blue-500')
    expect(group.type).toBe('group')
    expect(group.isDeleted).toBe(false)
  })

  it('updates a group correctly', () => {
    const { createGroup, updateGroup } = useStore.getState()

    const group = createGroup({
      name: 'Work',
      color: 'bg-blue-500',
    })

    updateGroup(group.id, { name: 'Personal', color: 'bg-green-500' })

    const updated = useStore.getState().groups.get(group.id)
    expect(updated?.name).toBe('Personal')
    expect(updated?.color).toBe('bg-green-500')
  })

  it('soft deletes a group', () => {
    const { createGroup, deleteGroup } = useStore.getState()

    const group = createGroup({
      name: 'To Delete',
      color: 'bg-red-500',
    })

    deleteGroup(group.id)

    const deleted = useStore.getState().groups.get(group.id)
    expect(deleted?.isDeleted).toBe(true)
  })
})

describe('Store - Prompt Version Operations', () => {
  it('creates a prompt version', () => {
    const { createPrompt, createPromptVersion } = useStore.getState()

    const prompt = createPrompt({
      title: 'Test',
      content: 'v1',
      category: 'General',
      isFavorite: false,
    })

    const version = createPromptVersion({
      promptId: prompt.id,
      content: 'v1 content',
      note: 'Initial version',
    })

    expect(version.id).toBeDefined()
    expect(version.promptId).toBe(prompt.id)
    expect(version.content).toBe('v1 content')
    expect(version.note).toBe('Initial version')
    expect(version.type).toBe('prompt_version')
  })
})

describe('Store - Selectors', () => {
  it('selectActivePrompts filters deleted prompts', () => {
    const { createPrompt, deletePrompt } = useStore.getState()

    const p1 = createPrompt({ title: 'P1', content: '', category: '', isFavorite: false })
    const p2 = createPrompt({ title: 'P2', content: '', category: '', isFavorite: false })
    createPrompt({ title: 'P3', content: '', category: '', isFavorite: false })

    deletePrompt(p2.id)

    const active = selectActivePrompts(useStore.getState())
    expect(active.length).toBe(2)
    expect(active.find(p => p.id === p2.id)).toBeUndefined()
  })

  it('selectActiveGroups filters deleted groups', () => {
    const { createGroup, deleteGroup } = useStore.getState()

    createGroup({ name: 'G1', color: 'bg-blue-500' })
    const g2 = createGroup({ name: 'G2', color: 'bg-red-500' })

    deleteGroup(g2.id)

    const active = selectActiveGroups(useStore.getState())
    expect(active.length).toBe(1)
    expect(active[0].name).toBe('G1')
  })

  it('selectFavoritePrompts returns only favorites', () => {
    const { createPrompt } = useStore.getState()

    createPrompt({ title: 'Not Fav', content: '', category: '', isFavorite: false })
    createPrompt({ title: 'Fav 1', content: '', category: '', isFavorite: true })
    createPrompt({ title: 'Fav 2', content: '', category: '', isFavorite: true })

    const favorites = selectFavoritePrompts(useStore.getState())
    expect(favorites.length).toBe(2)
    expect(favorites.every(p => p.isFavorite)).toBe(true)
  })

  it('selectPromptsByGroup returns prompts in group', () => {
    const { createPrompt, createGroup } = useStore.getState()

    const group = createGroup({ name: 'Work', color: 'bg-blue-500' })

    createPrompt({ title: 'In Group', content: '', category: '', isFavorite: false, groupId: group.id })
    createPrompt({ title: 'In Group 2', content: '', category: '', isFavorite: false, groupId: group.id })
    createPrompt({ title: 'No Group', content: '', category: '', isFavorite: false })

    const inGroup = selectPromptsByGroup(useStore.getState(), group.id)
    expect(inGroup.length).toBe(2)
    expect(inGroup.every(p => p.groupId === group.id)).toBe(true)
  })
})

describe('Store - Server Changes', () => {
  it('applies created entities from server', () => {
    const { _applyServerChanges } = useStore.getState()

    _applyServerChanges({
      syncId: 1,
      timestamp: new Date().toISOString(),
      hasMore: false,
      changes: {
        prompts: {
          created: [{
            id: 'server-prompt-1',
            type: 'prompt',
            title: 'Server Prompt',
            content: 'From server',
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
            id: 'server-group-1',
            type: 'group',
            name: 'Server Group',
            color: 'bg-purple-500',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
          updated: [],
          deleted: [],
        },
      },
    })

    const state = useStore.getState()
    expect(state.prompts.get('server-prompt-1')?.title).toBe('Server Prompt')
    expect(state.groups.get('server-group-1')?.name).toBe('Server Group')
    expect(state.syncState.lastSyncId).toBe(1)
  })

  it('applies updated entities from server', () => {
    const { createPrompt, _applyServerChanges } = useStore.getState()

    const prompt = createPrompt({
      title: 'Original',
      content: 'Content',
      category: 'General',
      isFavorite: false,
    })

    _applyServerChanges({
      syncId: 2,
      timestamp: new Date().toISOString(),
      hasMore: false,
      changes: {
        prompts: {
          created: [],
          updated: [{
            ...prompt,
            title: 'Updated by Server',
            syncId: 2,
          }],
          deleted: [],
        },
        promptVersions: { created: [], updated: [], deleted: [] },
        groups: { created: [], updated: [], deleted: [] },
      },
    })

    expect(useStore.getState().prompts.get(prompt.id)?.title).toBe('Updated by Server')
  })

  it('applies deleted entities from server', () => {
    const { createPrompt, _applyServerChanges } = useStore.getState()

    const prompt = createPrompt({
      title: 'To Be Deleted',
      content: 'Content',
      category: 'General',
      isFavorite: false,
    })

    _applyServerChanges({
      syncId: 3,
      timestamp: new Date().toISOString(),
      hasMore: false,
      changes: {
        prompts: {
          created: [],
          updated: [],
          deleted: [prompt.id],
        },
        promptVersions: { created: [], updated: [], deleted: [] },
        groups: { created: [], updated: [], deleted: [] },
      },
    })

    expect(useStore.getState().prompts.get(prompt.id)?.isDeleted).toBe(true)
  })
})

describe('Store - Sync State', () => {
  it('updates sync state correctly', () => {
    const { _updateSyncState } = useStore.getState()

    _updateSyncState({ status: 'syncing', lastError: null })
    expect(useStore.getState().syncState.status).toBe('syncing')

    _updateSyncState({ status: 'error', lastError: 'Network error' })
    expect(useStore.getState().syncState.status).toBe('error')
    expect(useStore.getState().syncState.lastError).toBe('Network error')
  })
})
