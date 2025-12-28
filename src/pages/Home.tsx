import { useState, useEffect } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit2,
  Moon,
  Sun,
  Star,
  Clock,
  MessageSquare,
  ArrowRight,
  Files,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Body, Title2, Title3, Caption } from "@/components/ui/typography"
import { Sidebar, type Group } from "@/components/Sidebar"
import { GroupDialog } from "@/components/GroupDialog"
import { CommandPalette } from "@/components/CommandPalette"

interface Prompt {
  id: string
  title: string
  content: string
  category: string
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  groupId?: string
  versions: Array<{ id: string; content: string; createdAt: string; note?: string }>
}

interface Update {
  id: string
  type: "created" | "edited" | "used" | "shared"
  promptTitle: string
  promptId: string
  timestamp: string
}

const SAMPLE_UPDATES: Update[] = [
  { id: "1", type: "used", promptTitle: "Code Review Assistant", promptId: "1", timestamp: "10 minutes ago" },
  { id: "2", type: "edited", promptTitle: "Data Analysis Expert", promptId: "3", timestamp: "2 hours ago" },
  { id: "3", type: "created", promptTitle: "API Documentation Writer", promptId: "6", timestamp: "Yesterday" },
  { id: "4", type: "shared", promptTitle: "Meeting Summarizer", promptId: "4", timestamp: "Yesterday" },
  { id: "5", type: "used", promptTitle: "Email Draft Assistant", promptId: "5", timestamp: "2 days ago" },
  { id: "6", type: "edited", promptTitle: "Creative Writing Partner", promptId: "2", timestamp: "3 days ago" },
]

const UPDATE_ICONS: Record<Update["type"], { icon: typeof Clock; label: string; color: string }> = {
  created: { icon: Plus, label: "Created", color: "text-green-500" },
  edited: { icon: Edit2, label: "Edited", color: "text-blue-500" },
  used: { icon: MessageSquare, label: "Used", color: "text-purple-500" },
  shared: { icon: ArrowRight, label: "Shared", color: "text-orange-500" },
}

interface PromptCardProps {
  prompt: Prompt
  onCopy: (content: string) => void
  onView: (promptId: string) => void
  onEdit: (promptId: string) => void
  onDuplicate: (promptId: string) => void
  onDelete: (promptId: string) => void
  compact?: boolean
  groups: Group[]
}

function PromptCard({ prompt, onCopy, onView, onEdit, onDuplicate, onDelete, compact = false, groups }: PromptCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0)

  const assignedGroup = groups.find(g => g.id === prompt.groupId)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (deleteConfirmStep === 0) {
      setDeleteConfirmStep(1)
    } else {
      onDelete(prompt.id)
      setShowMenu(false)
      setDeleteConfirmStep(0)
    }
  }

  const closeMenu = () => {
    setShowMenu(false)
    setDeleteConfirmStep(0)
  }

  return (
    <Card
      className={`group relative hover:shadow-elevated transition-shadow cursor-pointer ${compact ? 'p-3' : 'p-4'}`}
      onClick={() => onView(prompt.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Title3 className={`truncate ${compact ? 'text-sm' : ''}`}>{prompt.title}</Title3>
            {prompt.isFavorite && (
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
          </div>
          {!compact && (
            <Body tone="secondary" size="sm" className="line-clamp-2 mb-3">
              {prompt.content}
            </Body>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {assignedGroup && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                <div className={`h-2 w-2 rounded-full ${assignedGroup.color}`} />
                {assignedGroup.name}
              </div>
            )}
            <Caption tone="tertiary">{prompt.createdAt}</Caption>
          </div>
        </div>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
              setDeleteConfirmStep(0)
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={closeMenu}
              />
              <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated)] shadow-popover py-1">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCopy(prompt.content)
                    closeMenu()
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy prompt
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(prompt.id)
                    closeMenu()
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(prompt.id)
                    closeMenu()
                  }}
                >
                  <Files className="h-4 w-4" />
                  Duplicate
                </button>
                <div className="my-1 border-t border-[var(--border-secondary)]" />
                {deleteConfirmStep === 0 ? (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-[var(--bg-tertiary)] transition-colors"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : (
                  <div className="px-3 py-2">
                    <p className="text-xs text-red-500 font-medium mb-2">Delete this prompt?</p>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 px-2 py-1 text-xs rounded border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmStep(0)
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="flex-1 px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                        onClick={handleDelete}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

function UpdateItem({ update }: { update: Update }) {
  const { icon: Icon, label, color } = UPDATE_ICONS[update.type]

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer">
      <div className={`h-8 w-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="text-[var(--text-tertiary)]">{label}</span>{" "}
          <span className="font-medium truncate">{update.promptTitle}</span>
        </p>
        <Caption tone="tertiary">{update.timestamp}</Caption>
      </div>
    </div>
  )
}

interface HomeProps {
  onLogout: () => void
  userName: string
  onNewPrompt: () => void
  onViewPrompt: (promptId: string) => void
  onEditPrompt: (promptId: string) => void
  onDuplicatePrompt: (promptId: string) => void
  prompts: Prompt[]
  groups: Group[]
  onAddGroup: (group: Omit<Group, "id" | "promptCount">) => void
  onEditGroup: (groupId: string, data: { name: string; color: string }) => void
  onDeleteGroup: (groupId: string) => void
  onDeletePrompt: (promptId: string) => void
}

export function Home({
  onLogout,
  userName,
  onNewPrompt,
  onViewPrompt,
  onEditPrompt,
  onDuplicatePrompt,
  prompts,
  groups,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
  onDeletePrompt,
}: HomeProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDark, setIsDark] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<"all" | "favorites" | "recent" | string>("all")

  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groupDialogMode, setGroupDialogMode] = useState<"add" | "edit">("add")
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Keyboard shortcut for command palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const favoritePrompts = prompts.filter((p) => p.isFavorite)

  // Filter prompts based on active view
  const getFilteredPrompts = () => {
    let filtered = prompts

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (prompt) =>
          prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prompt.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply view filter
    if (activeView === "favorites") {
      return filtered.filter((p) => p.isFavorite)
    } else if (activeView === "recent") {
      return filtered.slice(0, 5)
    } else if (activeView.startsWith("group-")) {
      const groupId = activeView.replace("group-", "")
      return filtered.filter((p) => p.groupId === groupId)
    }

    return filtered
  }

  const displayPrompts = getFilteredPrompts()

  // Recalculate group prompt counts
  const groupsWithCounts = groups.map(group => ({
    ...group,
    promptCount: prompts.filter(p => p.groupId === group.id).length
  }))

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(content)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleDarkMode = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle("dark", !isDark)
  }

  // Group dialog handlers
  const handleAddGroup = () => {
    setGroupDialogMode("add")
    setEditingGroup(null)
    setGroupDialogOpen(true)
  }

  const handleEditGroup = (group: Group) => {
    setGroupDialogMode("edit")
    setEditingGroup(group)
    setGroupDialogOpen(true)
  }

  const handleDeleteGroupFromSidebar = (groupId: string) => {
    onDeleteGroup(groupId)
    // If we were viewing this group, go back to all
    if (activeView === `group-${groupId}`) {
      setActiveView("all")
    }
  }

  const handleSaveGroup = (groupData: Omit<Group, "id" | "promptCount"> & { id?: string }) => {
    if (groupData.id) {
      onEditGroup(groupData.id, { name: groupData.name, color: groupData.color })
    } else {
      onAddGroup({ name: groupData.name, color: groupData.color })
    }
  }

  // Get current group name for header
  const getCurrentViewTitle = () => {
    if (activeView === "favorites") return "Favorites"
    if (activeView === "recent") return "Recent Prompts"
    if (activeView.startsWith("group-")) {
      const groupId = activeView.replace("group-", "")
      const group = groups.find(g => g.id === groupId)
      return group?.name || "Group"
    }
    return "All Prompts"
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-secondary)] bg-[var(--bg-elevated)]/80 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary" />
            <span className="font-semibold text-lg">Prompts</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={onNewPrompt}>
              <Plus className="h-4 w-4 mr-1.5" />
              New
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-[var(--bg-tertiary)] transition-colors">
                <Avatar name={userName} size="sm" />
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block">
                <div className="w-48 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated)] shadow-popover py-1">
                  <div className="px-3 py-2 border-b border-[var(--border-secondary)]">
                    <p className="font-medium text-sm">{userName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">you@example.com</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          groups={groupsWithCounts}
          onAddGroup={handleAddGroup}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroupFromSidebar}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Show different content based on view */}
            {activeView === "all" ? (
              <>
                {/* Favorites Section */}
                {favoritePrompts.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <Title2>Favorites</Title2>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setActiveView("favorites")}>
                        View all
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {favoritePrompts.slice(0, 3).map((prompt) => (
                        <PromptCard
                          key={prompt.id}
                          prompt={prompt}
                          onCopy={handleCopy}
                          onView={onViewPrompt}
                          onEdit={onEditPrompt}
                          onDuplicate={onDuplicatePrompt}
                          onDelete={onDeletePrompt}
                          compact
                          groups={groups}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Recent Activity Section */}
                <section className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-[var(--text-tertiary)]" />
                      <Title2>Recent Activity</Title2>
                    </div>
                  </div>
                  <Card className="divide-y divide-[var(--border-secondary)]">
                    {SAMPLE_UPDATES.slice(0, 5).map((update) => (
                      <UpdateItem key={update.id} update={update} />
                    ))}
                  </Card>
                </section>

                {/* All Prompts Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <Title2>All Prompts</Title2>
                    <Body tone="secondary" size="sm">
                      {prompts.length} prompts
                    </Body>
                  </div>

                  {/* Search */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-quaternary)]" />
                      <Input
                        placeholder="Search prompts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Prompts Grid */}
                  {displayPrompts.length > 0 ? (
                    <div className="grid gap-3">
                      {displayPrompts.map((prompt) => (
                        <PromptCard
                          key={prompt.id}
                          prompt={prompt}
                          onCopy={handleCopy}
                          onView={onViewPrompt}
                          onEdit={onEditPrompt}
                          onDuplicate={onDuplicatePrompt}
                          onDelete={onDeletePrompt}
                          groups={groups}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-tertiary)] mb-4">
                        <Search className="h-5 w-5 text-[var(--text-tertiary)]" />
                      </div>
                      <Title3 className="mb-2">No prompts found</Title3>
                      <Body tone="secondary">
                        {searchQuery
                          ? "Try a different search term"
                          : "Create your first prompt to get started"}
                      </Body>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <>
                {/* Filtered View (Favorites, Recent, or Group) */}
                <div className="flex items-center gap-2 mb-6">
                  {activeView.startsWith("group-") && (
                    <div className={`h-3 w-3 rounded-full ${groups.find(g => g.id === activeView.replace("group-", ""))?.color || "bg-gray-500"}`} />
                  )}
                  <Title2>{getCurrentViewTitle()}</Title2>
                </div>

                {/* Search for group view */}
                {activeView.startsWith("group-") && (
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-quaternary)]" />
                      <Input
                        placeholder="Search in group..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                )}

                {displayPrompts.length > 0 ? (
                  <div className="grid gap-3">
                    {displayPrompts.map((prompt) => (
                      <PromptCard
                        key={prompt.id}
                        prompt={prompt}
                        onCopy={handleCopy}
                        onView={onViewPrompt}
                        onEdit={onEditPrompt}
                        onDuplicate={onDuplicatePrompt}
                        onDelete={onDeletePrompt}
                        groups={groups}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-tertiary)] mb-4">
                      <Star className="h-5 w-5 text-[var(--text-tertiary)]" />
                    </div>
                    <Title3 className="mb-2">No prompts yet</Title3>
                    <Body tone="secondary">
                      {activeView === "favorites"
                        ? "Star prompts to add them to your favorites"
                        : activeView.startsWith("group-")
                        ? "Add prompts to this group from the prompt menu"
                        : "Prompts you use will appear here"}
                    </Body>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Group Dialog */}
      <GroupDialog
        isOpen={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        onSave={handleSaveGroup}
        onDelete={editingGroup ? () => {
          handleDeleteGroupFromSidebar(editingGroup.id)
          setGroupDialogOpen(false)
        } : undefined}
        group={editingGroup}
        mode={groupDialogMode}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        prompts={prompts}
        groups={groups}
        onNewPrompt={onNewPrompt}
        onViewPrompt={onViewPrompt}
        onNavigate={setActiveView}
        onToggleDarkMode={toggleDarkMode}
        onLogout={onLogout}
        isDark={isDark}
      />

      {/* Toast for copy confirmation */}
      {copiedId && (
        <div className="fixed bottom-4 right-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg shadow-popover text-sm font-medium animate-fade-in">
          Copied to clipboard
        </div>
      )}
    </div>
  )
}
