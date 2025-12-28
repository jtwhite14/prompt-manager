import { useState } from "react"
import {
  ArrowLeft,
  Copy,
  Star,
  Trash2,
  History,
  RotateCcw,
  Check,
  Edit2,
  ChevronDown,
  ChevronRight,
  Files,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Body, Title2, Caption } from "@/components/ui/typography"

interface Group {
  id: string
  name: string
  color: string
}

interface PromptVersion {
  id: string
  content: string
  createdAt: string
  note?: string
}

interface Prompt {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  groupId?: string
  versions: PromptVersion[]
}

interface PromptViewProps {
  prompt: Prompt
  groups: Group[]
  onBack: () => void
  onEdit: () => void
  onRestoreVersion: (versionId: string) => void
  onDuplicate: () => void
  onToggleFavorite: () => void
  onDelete: () => void
}

export function PromptView({
  prompt,
  groups,
  onBack,
  onEdit,
  onRestoreVersion,
  onDuplicate,
  onToggleFavorite,
  onDelete,
}: PromptViewProps) {
  const [copied, setCopied] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0)

  const assignedGroup = groups.find(g => g.id === prompt.groupId)

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRestore = (versionId: string) => {
    onRestoreVersion(versionId)
    setSelectedVersion(null)
  }

  const handleDelete = () => {
    if (deleteConfirmStep === 0) {
      setDeleteConfirmStep(1)
    } else {
      onDelete()
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmStep(0)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-secondary)] bg-[var(--bg-elevated)]/80 backdrop-blur-sm">
        <div className="flex h-14 items-center px-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-sm text-[var(--text-secondary)]">Back to prompts</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Meta */}
            <div>
              <div className="flex items-start gap-3 mb-3">
                <h1 className="text-2xl font-semibold flex-1">{prompt.title}</h1>
                {prompt.isFavorite && (
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 flex-shrink-0 mt-1" />
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-sm">
                {assignedGroup && (
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <div className={`h-2.5 w-2.5 rounded-full ${assignedGroup.color}`} />
                    {assignedGroup.name}
                  </div>
                )}
                <span className="text-[var(--text-tertiary)]">Created {prompt.createdAt}</span>
                <span className="text-[var(--text-tertiary)]">Updated {prompt.updatedAt}</span>
              </div>
            </div>

            {/* Content */}
            <Card className="p-5">
              <Body className="whitespace-pre-wrap leading-relaxed">
                {prompt.content}
              </Body>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <Card className="p-4">
              <Title2 className="mb-3">Actions</Title2>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy prompt
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={onEdit}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit prompt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={onDuplicate}
                >
                  <Files className="h-4 w-4 mr-2" />
                  Duplicate prompt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={onToggleFavorite}
                >
                  <Star className={`h-4 w-4 mr-2 ${prompt.isFavorite ? "text-yellow-500 fill-yellow-500" : ""}`} />
                  {prompt.isFavorite ? "Remove from favorites" : "Add to favorites"}
                </Button>
                {deleteConfirmStep === 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete prompt
                  </Button>
                ) : (
                  <div className="p-3 rounded-md border border-[var(--border-primary)] space-y-2">
                    <p className="text-sm font-medium">Delete this prompt?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={cancelDelete}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500"
                        onClick={handleDelete}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Version History */}
            <Card className="overflow-hidden">
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <Title2>Version History</Title2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
                    {prompt.versions.length}
                  </span>
                  {showVersionHistory ? (
                    <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                  )}
                </div>
              </button>

              {showVersionHistory && (
                <div className="border-t border-[var(--border-secondary)]">
                  {prompt.versions.map((version, index) => (
                    <div
                      key={version.id}
                      className={`border-b border-[var(--border-secondary)] last:border-b-0 ${
                        selectedVersion === version.id ? "bg-[var(--bg-secondary)]" : ""
                      }`}
                    >
                      <button
                        onClick={() => setSelectedVersion(selectedVersion === version.id ? null : version.id)}
                        className="w-full p-3 text-left hover:bg-[var(--bg-secondary)] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            {version.id.toUpperCase()}
                            {index === 0 && (
                              <span className="ml-2 text-xs text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">
                                Current
                              </span>
                            )}
                          </span>
                          <Caption>{version.createdAt}</Caption>
                        </div>
                        {version.note && (
                          <p className="text-xs text-[var(--text-tertiary)]">{version.note}</p>
                        )}
                      </button>

                      {selectedVersion === version.id && (
                        <div className="px-3 pb-3 space-y-3">
                          <div className="bg-[var(--bg-tertiary)] rounded-md p-3 max-h-32 overflow-y-auto">
                            <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                              {version.content}
                            </p>
                          </div>
                          {index !== 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => handleRestore(version.id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                              Restore this version
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
