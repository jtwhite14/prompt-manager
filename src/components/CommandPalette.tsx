import { useState, useEffect, useRef, useMemo } from "react"
import {
  Search,
  Plus,
  Star,
  Clock,
  FolderOpen,
  Moon,
  Sun,
  LogOut,
  FileText,
  Command,
} from "lucide-react"

interface Prompt {
  id: string
  title: string
  content: string
  isFavorite: boolean
  groupId?: string
}

interface Group {
  id: string
  name: string
  color: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  prompts: Prompt[]
  groups: Group[]
  onNewPrompt: () => void
  onViewPrompt: (promptId: string) => void
  onNavigate: (view: "all" | "favorites" | "recent" | string) => void
  onToggleDarkMode: () => void
  onLogout: () => void
  isDark: boolean
}

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: typeof Search
  action: () => void
  category: "action" | "prompt" | "navigation" | "group"
  keywords?: string[]
}

export function CommandPalette({
  isOpen,
  onClose,
  prompts,
  groups,
  onNewPrompt,
  onViewPrompt,
  onNavigate,
  onToggleDarkMode,
  onLogout,
  isDark,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Actions
      {
        id: "new-prompt",
        label: "Create New Prompt",
        description: "Start writing a new prompt",
        icon: Plus,
        action: () => { onNewPrompt(); onClose() },
        category: "action",
        keywords: ["new", "create", "add", "write"],
      },
      {
        id: "toggle-theme",
        label: isDark ? "Switch to Light Mode" : "Switch to Dark Mode",
        description: "Toggle dark/light theme",
        icon: isDark ? Sun : Moon,
        action: () => { onToggleDarkMode(); onClose() },
        category: "action",
        keywords: ["theme", "dark", "light", "mode"],
      },
      {
        id: "logout",
        label: "Sign Out",
        description: "Log out of your account",
        icon: LogOut,
        action: () => { onLogout(); onClose() },
        category: "action",
        keywords: ["logout", "sign out", "exit"],
      },
      // Navigation
      {
        id: "nav-all",
        label: "All Prompts",
        description: "View all your prompts",
        icon: FolderOpen,
        action: () => { onNavigate("all"); onClose() },
        category: "navigation",
        keywords: ["all", "prompts", "home"],
      },
      {
        id: "nav-favorites",
        label: "Favorites",
        description: "View your favorite prompts",
        icon: Star,
        action: () => { onNavigate("favorites"); onClose() },
        category: "navigation",
        keywords: ["favorites", "starred", "bookmarks"],
      },
      {
        id: "nav-recent",
        label: "Recent",
        description: "View recently used prompts",
        icon: Clock,
        action: () => { onNavigate("recent"); onClose() },
        category: "navigation",
        keywords: ["recent", "history", "latest"],
      },
    ]

    // Add groups as navigation items
    groups.forEach((group) => {
      items.push({
        id: `group-${group.id}`,
        label: group.name,
        description: "Go to group",
        icon: FolderOpen,
        action: () => { onNavigate(`group-${group.id}`); onClose() },
        category: "group",
        keywords: ["group", group.name.toLowerCase()],
      })
    })

    // Add prompts as searchable items
    prompts.forEach((prompt) => {
      items.push({
        id: `prompt-${prompt.id}`,
        label: prompt.title,
        description: prompt.content.substring(0, 60) + (prompt.content.length > 60 ? "..." : ""),
        icon: FileText,
        action: () => { onViewPrompt(prompt.id); onClose() },
        category: "prompt",
        keywords: [prompt.title.toLowerCase(), ...prompt.content.toLowerCase().split(" ").slice(0, 10)],
      })
    })

    return items
  }, [prompts, groups, isDark, onNewPrompt, onViewPrompt, onNavigate, onToggleDarkMode, onLogout, onClose])

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show actions and navigation by default, limit prompts
      const actions = commands.filter(c => c.category === "action")
      const navigation = commands.filter(c => c.category === "navigation")
      const groupItems = commands.filter(c => c.category === "group")
      const promptItems = commands.filter(c => c.category === "prompt").slice(0, 5)
      return [...actions, ...navigation, ...groupItems, ...promptItems]
    }

    const lowerQuery = query.toLowerCase()
    return commands.filter((cmd) => {
      if (cmd.label.toLowerCase().includes(lowerQuery)) return true
      if (cmd.description?.toLowerCase().includes(lowerQuery)) return true
      if (cmd.keywords?.some(k => k.includes(lowerQuery))) return true
      return false
    }).slice(0, 10)
  }, [commands, query])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened and lock body scroll
  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)

      // Lock body scroll
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedIndex])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        e.stopPropagation()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
        }
        break
      case "Escape":
        e.preventDefault()
        e.stopPropagation()
        onClose()
        break
    }
  }

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    const groups: { category: string; items: CommandItem[] }[] = []
    const categoryOrder = ["action", "navigation", "group", "prompt"]
    const categoryLabels: Record<string, string> = {
      action: "Actions",
      navigation: "Navigation",
      group: "Groups",
      prompt: "Prompts",
    }

    categoryOrder.forEach((category) => {
      const items = filteredCommands.filter((c) => c.category === category)
      if (items.length > 0) {
        groups.push({ category: categoryLabels[category], items })
      }
    })

    return groups
  }, [filteredCommands])

  // Calculate flat index for keyboard navigation
  const getFlatIndex = (categoryIndex: number, itemIndex: number) => {
    let index = 0
    for (let i = 0; i < categoryIndex; i++) {
      index += groupedCommands[i].items.length
    }
    return index + itemIndex
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] overflow-hidden pointer-events-none">
        <div
          className="w-full max-w-lg mx-4 bg-[var(--bg-elevated)] rounded-xl shadow-2xl border border-[var(--border-primary)] overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-secondary)]">
            <Search className="h-5 w-5 text-[var(--text-tertiary)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search prompts, actions, and more..."
              className="flex-1 bg-transparent text-base outline-none placeholder:text-[var(--text-quaternary)]"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] rounded border border-[var(--border-secondary)]">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto overscroll-contain py-2">
            {groupedCommands.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-[var(--text-tertiary)]">No results found</p>
              </div>
            ) : (
              groupedCommands.map((group, groupIndex) => (
                <div key={group.category}>
                  <div className="px-4 py-1.5">
                    <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      {group.category}
                    </p>
                  </div>
                  {group.items.map((item, itemIndex) => {
                    const flatIndex = getFlatIndex(groupIndex, itemIndex)
                    const isSelected = flatIndex === selectedIndex
                    const Icon = item.icon

                    return (
                      <button
                        key={item.id}
                        data-index={flatIndex}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected
                            ? "bg-[var(--bg-tertiary)]"
                            : "hover:bg-[var(--bg-secondary)]"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          item.category === "prompt"
                            ? "bg-blue-500/10 text-blue-500"
                            : item.category === "group"
                            ? "bg-purple-500/10 text-purple-500"
                            : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          {item.description && (
                            <p className="text-xs text-[var(--text-tertiary)] truncate">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded border border-[var(--border-secondary)]">
                            ↵
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded border border-[var(--border-secondary)]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded border border-[var(--border-secondary)]">↓</kbd>
                <span className="ml-1">Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-[var(--bg-tertiary)] rounded border border-[var(--border-secondary)]">↵</kbd>
                <span className="ml-1">Select</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--text-quaternary)]">
              <Command className="h-3 w-3" />
              <span>K to open</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
