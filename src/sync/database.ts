/**
 * IndexedDB Database using Dexie.js
 *
 * This provides persistent local storage that survives page refreshes.
 * The in-memory Zustand store hydrates from this on app startup.
 */

import Dexie, { type Table } from 'dexie'
import type {
  PromptEntity,
  PromptVersionEntity,
  GroupEntity,
  PendingMutation,
  SyncMetadata,
} from './types'

export class PromptManagerDB extends Dexie {
  // Entity tables
  prompts!: Table<PromptEntity, string>
  promptVersions!: Table<PromptVersionEntity, string>
  groups!: Table<GroupEntity, string>

  // Sync tables
  pendingMutations!: Table<PendingMutation, string>
  syncMetadata!: Table<SyncMetadata, string>

  constructor() {
    super('PromptManagerDB')

    // Define schema with indexes
    // The ++ prefix means auto-increment, & means unique
    this.version(1).stores({
      // Entity tables - indexed by id and syncId for efficient queries
      prompts: 'id, syncId, groupId, isFavorite, isDeleted, updatedAt',
      promptVersions: 'id, syncId, promptId, isDeleted, updatedAt',
      groups: 'id, syncId, isDeleted, updatedAt',

      // Pending mutations - ordered by timestamp for FIFO processing
      pendingMutations: 'id, entityType, entityId, timestamp',

      // Sync metadata - single row table
      syncMetadata: 'id',
    })
  }

  /**
   * Get all non-deleted prompts
   */
  async getActivePrompts(): Promise<PromptEntity[]> {
    return this.prompts.filter((p) => !p.isDeleted).toArray()
  }

  /**
   * Get all non-deleted groups
   */
  async getActiveGroups(): Promise<GroupEntity[]> {
    return this.groups.filter((g) => !g.isDeleted).toArray()
  }

  /**
   * Get versions for a specific prompt
   */
  async getPromptVersions(promptId: string): Promise<PromptVersionEntity[]> {
    return this.promptVersions
      .where('promptId')
      .equals(promptId)
      .filter((v) => !v.isDeleted)
      .toArray()
  }

  /**
   * Get all pending mutations in order
   */
  async getPendingMutations(): Promise<PendingMutation[]> {
    return this.pendingMutations.orderBy('timestamp').toArray()
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata(): Promise<SyncMetadata | undefined> {
    return this.syncMetadata.get('sync_metadata')
  }

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(data: Partial<SyncMetadata>): Promise<void> {
    await this.syncMetadata.put({
      id: 'sync_metadata',
      lastSyncId: data.lastSyncId ?? 0,
      lastSyncedAt: data.lastSyncedAt ?? null,
      clientId: data.clientId ?? crypto.randomUUID(),
    })
  }

  /**
   * Add a pending mutation
   */
  async addPendingMutation(mutation: PendingMutation): Promise<void> {
    await this.pendingMutations.put(mutation)
  }

  /**
   * Remove a pending mutation by ID
   */
  async removePendingMutation(mutationId: string): Promise<void> {
    await this.pendingMutations.delete(mutationId)
  }

  /**
   * Update a pending mutation (e.g., increment retry count)
   */
  async updatePendingMutation(
    mutationId: string,
    updates: Partial<PendingMutation>
  ): Promise<void> {
    await this.pendingMutations.update(mutationId, updates)
  }

  /**
   * Apply a batch of entity changes from sync
   */
  async applyEntityChanges(changes: {
    prompts?: { created: PromptEntity[]; updated: PromptEntity[]; deleted: string[] }
    promptVersions?: {
      created: PromptVersionEntity[]
      updated: PromptVersionEntity[]
      deleted: string[]
    }
    groups?: { created: GroupEntity[]; updated: GroupEntity[]; deleted: string[] }
  }): Promise<void> {
    await this.transaction(
      'rw',
      [this.prompts, this.promptVersions, this.groups],
      async () => {
        // Prompts
        if (changes.prompts) {
          if (changes.prompts.created.length > 0) {
            await this.prompts.bulkPut(changes.prompts.created)
          }
          if (changes.prompts.updated.length > 0) {
            await this.prompts.bulkPut(changes.prompts.updated)
          }
          if (changes.prompts.deleted.length > 0) {
            // Soft delete - mark as deleted rather than removing
            await Promise.all(
              changes.prompts.deleted.map((id) =>
                this.prompts.update(id, { isDeleted: true })
              )
            )
          }
        }

        // Prompt Versions
        if (changes.promptVersions) {
          if (changes.promptVersions.created.length > 0) {
            await this.promptVersions.bulkPut(changes.promptVersions.created)
          }
          if (changes.promptVersions.updated.length > 0) {
            await this.promptVersions.bulkPut(changes.promptVersions.updated)
          }
          if (changes.promptVersions.deleted.length > 0) {
            await Promise.all(
              changes.promptVersions.deleted.map((id) =>
                this.promptVersions.update(id, { isDeleted: true })
              )
            )
          }
        }

        // Groups
        if (changes.groups) {
          if (changes.groups.created.length > 0) {
            await this.groups.bulkPut(changes.groups.created)
          }
          if (changes.groups.updated.length > 0) {
            await this.groups.bulkPut(changes.groups.updated)
          }
          if (changes.groups.deleted.length > 0) {
            await Promise.all(
              changes.groups.deleted.map((id) =>
                this.groups.update(id, { isDeleted: true })
              )
            )
          }
        }
      }
    )
  }

  /**
   * Clear all data (for testing or logout)
   */
  async clearAll(): Promise<void> {
    await this.transaction(
      'rw',
      [this.prompts, this.promptVersions, this.groups, this.pendingMutations, this.syncMetadata],
      async () => {
        await this.prompts.clear()
        await this.promptVersions.clear()
        await this.groups.clear()
        await this.pendingMutations.clear()
        await this.syncMetadata.clear()
      }
    )
  }
}

// Singleton instance
export const db = new PromptManagerDB()
