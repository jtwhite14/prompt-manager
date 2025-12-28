import { useState } from "react"
import {
  FolderOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  Settings,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface Group {
  id: string
  name: string
  promptCount: number
  color: string
}

interface SidebarProps {
  activeView: "all" | "favorites" | "recent" | string
  onViewChange: (view: "all" | "favorites" | "recent" | string) => void
  groups: Group[]
  onAddGroup: () => void
  onEditGroup: (group: Group) => void
  onDeleteGroup: (groupId: string) => void
}

export function Sidebar({
  activeView,
  onViewChange,
  groups,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
}: SidebarProps) {
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handleContextMenu = (e: React.MouseEvent, groupId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenMenuId(openMenuId === groupId ? null : groupId)
  }

  const handleEditClick = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation()
    setOpenMenuId(null)
    onEditGroup(group)
  }

  const handleDeleteClick = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation()
    setOpenMenuId(null)
    if (window.confirm("Are you sure you want to delete this group?")) {
      onDeleteGroup(groupId)
    }
  }

  return (
    <aside className="w-60 h-[calc(100vh-56px)] border-r border-[var(--border-secondary)] bg-[var(--bg-secondary)] flex flex-col sticky top-14 flex-shrink-0">
      {/* Navigation */}
      <nav className="p-3 space-y-1">
        <button
          onClick={() => onViewChange("all")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === "all"
              ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          All Prompts
        </button>
        <button
          onClick={() => onViewChange("favorites")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === "favorites"
              ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Star className="h-4 w-4" />
          Favorites
        </button>
        <button
          onClick={() => onViewChange("recent")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === "recent"
              ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Clock className="h-4 w-4" />
          Recent
        </button>
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-[var(--border-secondary)]" />

      {/* Groups Section */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setIsGroupsExpanded(!isGroupsExpanded)}
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider hover:text-[var(--text-secondary)]"
          >
            {isGroupsExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Groups
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5"
            title="New Group"
            onClick={onAddGroup}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {isGroupsExpanded && (
          <div className="space-y-0.5">
            {groups.length === 0 ? (
              <p className="text-xs text-[var(--text-quaternary)] px-3 py-2">
                No groups yet. Click + to create one.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="relative group/item">
                  <button
                    onClick={() => onViewChange(`group-${group.id}`)}
                    onContextMenu={(e) => handleContextMenu(e, group.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                      activeView === `group-${group.id}`
                        ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${group.color}`} />
                    <span className="flex-1 text-left truncate">{group.name}</span>
                    <span className="text-xs text-[var(--text-quaternary)] group-hover/item:hidden">
                      {group.promptCount}
                    </span>
                    <button
                      onClick={(e) => handleContextMenu(e, group.id)}
                      className="hidden group-hover/item:flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--bg-secondary)]"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </button>

                  {/* Dropdown Menu */}
                  {openMenuId === group.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-md shadow-lg py-1 min-w-[120px]">
                        <button
                          onClick={(e) => handleEditClick(e, group)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, group.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border-secondary)]">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  )
}
