import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface Group {
  id: string
  name: string
  promptCount: number
  color: string
}

const COLOR_OPTIONS = [
  { value: "bg-blue-500", label: "Blue" },
  { value: "bg-green-500", label: "Green" },
  { value: "bg-purple-500", label: "Purple" },
  { value: "bg-orange-500", label: "Orange" },
  { value: "bg-pink-500", label: "Pink" },
  { value: "bg-red-500", label: "Red" },
  { value: "bg-yellow-500", label: "Yellow" },
  { value: "bg-cyan-500", label: "Cyan" },
]

interface GroupDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (group: Omit<Group, "id" | "promptCount"> & { id?: string }) => void
  onDelete?: () => void
  group?: Group | null
  mode: "add" | "edit"
}

export function GroupDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  group,
  mode,
}: GroupDialogProps) {
  const [name, setName] = useState("")
  const [color, setColor] = useState("bg-blue-500")

  useEffect(() => {
    if (group && mode === "edit") {
      setName(group.name)
      setColor(group.color)
    } else {
      setName("")
      setColor("bg-blue-500")
    }
  }, [group, mode, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSave({
      id: group?.id,
      name: name.trim(),
      color,
    })
    onClose()
  }

  const handleDelete = () => {
    if (onDelete && window.confirm("Are you sure you want to delete this group? Prompts in this group will be moved to 'All Prompts'.")) {
      onDelete()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-[var(--bg-primary)] rounded-lg shadow-xl w-full max-w-md mx-4 border border-[var(--border-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {mode === "add" ? "New Group" : "Edit Group"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name Input */}
          <div>
            <label
              htmlFor="group-name"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Group Name
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-3 py-2 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={`h-8 w-8 rounded-full ${option.value} transition-all ${
                    color === option.value
                      ? "ring-2 ring-offset-2 ring-[var(--text-primary)] ring-offset-[var(--bg-primary)]"
                      : "hover:scale-110"
                  }`}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {mode === "edit" && onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  Delete Group
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!name.trim()}>
                {mode === "add" ? "Create Group" : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
