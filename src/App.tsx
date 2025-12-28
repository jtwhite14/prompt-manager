import { useState } from "react"
import { Login } from "@/pages/Login"
import { SignUp } from "@/pages/SignUp"
import { Home } from "@/pages/Home"
import { PromptEditor } from "@/pages/PromptEditor"
import { PromptView } from "@/pages/PromptView"
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator"
import {
  useSyncEngine,
  usePrompts,
  useGroups,
  usePromptActions,
  useGroupActions,
  useStore,
} from "@/sync"
import type { PromptEntity, GroupEntity, PromptVersionEntity } from "@/sync"

type Page = "login" | "signup" | "home" | "prompt-editor" | "view-prompt"

// Legacy interfaces for compatibility with existing components
export interface Group {
  id: string
  name: string
  promptCount: number
  color: string
}

export interface PromptVersion {
  id: string
  content: string
  createdAt: string
  note?: string
}

export interface Prompt {
  id: string
  title: string
  content: string
  category: string
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  groupId?: string
  versions: PromptVersion[]
}

// Convert sync entities to legacy format for existing components
function toGroup(entity: GroupEntity, promptCount: number): Group {
  return {
    id: entity.id,
    name: entity.name,
    color: entity.color,
    promptCount,
  }
}

function toPrompt(entity: PromptEntity, versions: PromptVersionEntity[]): Prompt {
  return {
    id: entity.id,
    title: entity.title,
    content: entity.content,
    category: entity.category,
    createdAt: new Date(entity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    updatedAt: formatRelativeTime(entity.updatedAt),
    isFavorite: entity.isFavorite,
    groupId: entity.groupId,
    versions: versions.map(v => ({
      id: v.id,
      content: v.content,
      createdAt: formatRelativeTime(v.createdAt),
      note: v.note,
    })),
  }
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function AppContent() {
  const [page, setPage] = useState<Page>("home") // Start at home since we're using local-first
  const [userName] = useState("John Doe")
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)

  // Get data from sync store
  const promptEntities = usePrompts()
  const groupEntities = useGroups()
  const { createPrompt, updatePrompt, deletePrompt } = usePromptActions()
  const { createGroup, updateGroup, deleteGroup } = useGroupActions()
  const createPromptVersion = useStore((state) => state.createPromptVersion)

  // Get versions for prompts (we need to call this per-prompt)
  const allVersions = useStore((state) => state.promptVersions)

  // Convert to legacy format
  const prompts: Prompt[] = promptEntities.map((p: PromptEntity) => {
    const versions = Array.from(allVersions.values())
      .filter((v: PromptVersionEntity) => v.promptId === p.id && !v.isDeleted)
      .sort((a: PromptVersionEntity, b: PromptVersionEntity) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return toPrompt(p, versions)
  })

  const groups: Group[] = groupEntities.map((g: GroupEntity) => {
    const count = promptEntities.filter((p: PromptEntity) => p.groupId === g.id).length
    return toGroup(g, count)
  })

  const handleLogout = () => {
    setPage("login")
  }

  const handleNewPrompt = () => {
    setEditingPromptId(null)
    setPage("prompt-editor")
  }

  const handleEditPrompt = (promptId: string) => {
    setEditingPromptId(promptId)
    setPage("prompt-editor")
  }

  const handleViewPrompt = (promptId: string) => {
    setSelectedPromptId(promptId)
    setPage("view-prompt")
  }

  const handleSavePrompt = (prompt: { title: string; content: string; groupId?: string }, versionNote?: string) => {
    if (editingPromptId) {
      // Editing existing prompt
      const existing = promptEntities.find((p: PromptEntity) => p.id === editingPromptId)
      if (existing) {
        updatePrompt(editingPromptId, {
          title: prompt.title,
          content: prompt.content,
          groupId: prompt.groupId,
        })

        // Create a version if content changed
        if (prompt.content !== existing.content) {
          createPromptVersion({
            promptId: editingPromptId,
            content: prompt.content,
            note: versionNote || "Updated",
          })
        }
      }
      setEditingPromptId(null)
      setSelectedPromptId(editingPromptId)
      setPage("view-prompt")
    } else {
      // Creating new prompt
      const newPrompt = createPrompt({
        title: prompt.title,
        content: prompt.content,
        category: "General",
        isFavorite: false,
        groupId: prompt.groupId,
      })

      // Create initial version
      createPromptVersion({
        promptId: newPrompt.id,
        content: prompt.content,
        note: "Initial version",
      })

      setPage("home")
    }
  }

  const handleRestoreVersion = (promptId: string, versionId: string) => {
    const versions = Array.from(allVersions.values()).filter(v => v.promptId === promptId)
    const version = versions.find(v => v.id === versionId)
    if (!version) return

    updatePrompt(promptId, { content: version.content })
    createPromptVersion({
      promptId,
      content: version.content,
      note: `Restored from ${versionId}`,
    })
  }

  const handleAddGroup = (group: Omit<Group, "id" | "promptCount">): string => {
    const newGroup = createGroup({
      name: group.name,
      color: group.color,
    })
    return newGroup.id
  }

  const handleEditGroup = (groupId: string, data: { name: string; color: string }) => {
    updateGroup(groupId, data)
  }

  const handleDeleteGroup = (groupId: string) => {
    deleteGroup(groupId)
    // Update prompts that were in this group
    promptEntities
      .filter((p: PromptEntity) => p.groupId === groupId)
      .forEach((p: PromptEntity) => updatePrompt(p.id, { groupId: undefined }))
  }

  const handleDeletePrompt = (promptId: string) => {
    deletePrompt(promptId)
  }

  const handleToggleFavorite = (promptId: string) => {
    const prompt = promptEntities.find((p: PromptEntity) => p.id === promptId)
    if (prompt) {
      updatePrompt(promptId, { isFavorite: !prompt.isFavorite })
    }
  }

  const handleDuplicatePrompt = (promptId: string) => {
    const prompt = promptEntities.find((p: PromptEntity) => p.id === promptId)
    if (!prompt) return

    const newPrompt = createPrompt({
      title: `${prompt.title} (Copy)`,
      content: prompt.content,
      category: prompt.category,
      isFavorite: false,
      groupId: prompt.groupId,
    })

    createPromptVersion({
      promptId: newPrompt.id,
      content: prompt.content,
      note: `Duplicated from "${prompt.title}"`,
    })

    return newPrompt.id
  }

  if (page === "view-prompt" && selectedPromptId) {
    const prompt = prompts.find(p => p.id === selectedPromptId)
    if (prompt) {
      return (
        <>
          <SyncStatusIndicator />
          <PromptView
            prompt={prompt}
            groups={groups}
            onBack={() => setPage("home")}
            onEdit={() => handleEditPrompt(selectedPromptId)}
            onDuplicate={() => {
              const newId = handleDuplicatePrompt(selectedPromptId)
              if (newId) {
                setSelectedPromptId(newId)
              }
            }}
            onRestoreVersion={(versionId) => handleRestoreVersion(selectedPromptId, versionId)}
            onToggleFavorite={() => handleToggleFavorite(selectedPromptId)}
            onDelete={() => {
              handleDeletePrompt(selectedPromptId)
              setPage("home")
            }}
          />
        </>
      )
    }
  }

  if (page === "prompt-editor") {
    const editingPrompt = editingPromptId ? prompts.find(p => p.id === editingPromptId) : null
    return (
      <>
        <SyncStatusIndicator />
        <PromptEditor
          onBack={() => {
            if (editingPromptId) {
              setSelectedPromptId(editingPromptId)
              setEditingPromptId(null)
              setPage("view-prompt")
            } else {
              setPage("home")
            }
          }}
          onSave={handleSavePrompt}
          onAddGroup={handleAddGroup}
          groups={groups}
          existingPrompt={editingPrompt ? {
            id: editingPrompt.id,
            title: editingPrompt.title,
            content: editingPrompt.content,
            groupId: editingPrompt.groupId
          } : null}
        />
      </>
    )
  }

  if (page === "home") {
    return (
      <>
        <SyncStatusIndicator />
        <Home
          onLogout={handleLogout}
          userName={userName}
          onNewPrompt={handleNewPrompt}
          onViewPrompt={handleViewPrompt}
          onEditPrompt={handleEditPrompt}
          onDuplicatePrompt={handleDuplicatePrompt}
          prompts={prompts}
          groups={groups}
          onAddGroup={handleAddGroup}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
          onDeletePrompt={handleDeletePrompt}
        />
      </>
    )
  }

  if (page === "signup") {
    return (
      <SignUp
        onNavigateToLogin={() => setPage("login")}
        onSignUp={() => setPage("home")}
      />
    )
  }

  return (
    <Login
      onNavigateToSignUp={() => setPage("signup")}
      onLogin={() => setPage("home")}
    />
  )
}

function App() {
  // Initialize sync engine - this hydrates from IndexedDB and starts syncing
  const { isHydrated } = useSyncEngine()

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary mx-auto mb-4 animate-pulse" />
          <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    )
  }

  return <AppContent />
}

export default App
