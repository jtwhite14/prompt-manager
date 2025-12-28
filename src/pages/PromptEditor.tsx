import { useState, useRef, useCallback, useEffect } from "react"
import {
  ArrowLeft,
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Undo,
  Redo,
  Sparkles,
  FolderOpen,
  Plus,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Body, Caption } from "@/components/ui/typography"

interface Group {
  id: string
  name: string
  promptCount: number
  color: string
}

interface ExistingPrompt {
  id: string
  title: string
  content: string
  groupId?: string
}

interface PromptEditorProps {
  onBack: () => void
  onSave: (prompt: { title: string; content: string; groupId?: string }, versionNote?: string) => void
  onAddGroup: (group: { name: string; color: string }) => string
  groups: Group[]
  existingPrompt?: ExistingPrompt | null
}

const GROUP_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
]

export function PromptEditor({ onBack, onSave, onAddGroup, groups, existingPrompt }: PromptEditorProps) {
  const isEditing = !!existingPrompt

  const [title, setTitle] = useState(existingPrompt?.title || "")
  const [content, setContent] = useState(existingPrompt?.content || "")
  const [groupId, setGroupId] = useState<string>(existingPrompt?.groupId || "")
  const [versionNote, setVersionNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showNewGroupForm, setShowNewGroupForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [history, setHistory] = useState<string[]>([existingPrompt?.content || ""])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [showAiAssistDialog, setShowAiAssistDialog] = useState(false)
  const [aiAssistPrompt, setAiAssistPrompt] = useState("")
  const [cursorPosition, setCursorPosition] = useState(0)
  const aiAssistInputRef = useRef<HTMLInputElement>(null)
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null)
  const [showSelectionMenu, setShowSelectionMenu] = useState(false)
  const [selectionEditMode, setSelectionEditMode] = useState(false)
  const [selectionEditPrompt, setSelectionEditPrompt] = useState("")
  const selectionInputRef = useRef<HTMLInputElement>(null)

  // Track if content has changed from original
  const hasContentChanged = isEditing && content !== existingPrompt?.content

  useEffect(() => {
    if (existingPrompt) {
      setTitle(existingPrompt.title)
      setContent(existingPrompt.content)
      setGroupId(existingPrompt.groupId || "")
      setHistory([existingPrompt.content])
      setHistoryIndex(0)
    }
  }, [existingPrompt])

  const canSave = title.trim() && content.trim()

  const handleSave = () => {
    if (!canSave) return
    setIsSaving(true)
    setTimeout(() => {
      onSave(
        { title, content, groupId: groupId || undefined },
        isEditing && hasContentChanged ? versionNote || "Updated" : undefined
      )
      setIsSaving(false)
    }, 300)
  }

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent)
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newContent])
    setHistoryIndex((prev) => prev + 1)
  }, [historyIndex])

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1)
      setContent(history[historyIndex - 1])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1)
      setContent(history[historyIndex + 1])
    }
  }

  const insertFormatting = (before: string, after: string = before) => {
    const textarea = document.querySelector('textarea[data-editor]') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end)

    updateContent(newText)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const insertAtCursor = (text: string) => {
    const textarea = document.querySelector('textarea[data-editor]') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const newText = content.substring(0, start) + text + content.substring(start)

    updateContent(newText)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  const openAiAssistDialog = () => {
    // Save cursor position before opening dialog
    const pos = textareaRef.current?.selectionStart || content.length
    setCursorPosition(pos)
    setShowAiAssistDialog(true)
    setAiAssistPrompt("")
    setTimeout(() => {
      aiAssistInputRef.current?.focus()
    }, 0)
  }

  const submitAiAssist = async () => {
    if (!aiAssistPrompt.trim() || isAiLoading) return

    setIsAiLoading(true)

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: aiAssistPrompt }],
          currentPrompt: { title, content: content.substring(0, cursorPosition) }
        })
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()

      // Extract just the prompt content if there's a code block
      let aiResponse = data.message
      const promptMatch = aiResponse.match(/```(?:PROMPT:?)?\s*\n([\s\S]*?)```/i)
      if (promptMatch) {
        aiResponse = promptMatch[1].trim()
      }

      // Insert AI response at cursor position
      const newContent = content.substring(0, cursorPosition) + aiResponse + content.substring(cursorPosition)
      updateContent(newContent)

      // Position cursor at end of inserted content
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = cursorPosition + aiResponse.length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newPos, newPos)
        }
      }, 0)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsAiLoading(false)
      setShowAiAssistDialog(false)
      setAiAssistPrompt("")
    }
  }

  const cancelAiAssist = () => {
    setShowAiAssistDialog(false)
    setAiAssistPrompt("")
    textareaRef.current?.focus()
  }

  const handleSelectionChange = () => {
    if (!textareaRef.current || selectionEditMode || isAiLoading) return

    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd

    if (start !== end) {
      const selectedText = content.substring(start, end)
      setSelection({ start, end, text: selectedText })
      setShowSelectionMenu(true)
    } else {
      setSelection(null)
      setShowSelectionMenu(false)
    }
  }

  const startSelectionEdit = () => {
    setShowSelectionMenu(false)
    setSelectionEditMode(true)
    setSelectionEditPrompt("")
    setTimeout(() => {
      selectionInputRef.current?.focus()
    }, 0)
  }

  const submitSelectionEdit = async () => {
    if (!selection || !selectionEditPrompt.trim() || isAiLoading) return

    setIsAiLoading(true)

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Edit the following text according to this instruction: "${selectionEditPrompt}"\n\nText to edit:\n${selection.text}\n\nRespond with ONLY the edited text, no explanations or markdown.`
          }],
          currentPrompt: { title, content }
        })
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()
      let editedText = data.message.trim()

      // Remove any markdown code blocks if present
      if (editedText.startsWith("```") && editedText.endsWith("```")) {
        editedText = editedText.slice(3, -3).replace(/^\w*\n/, "").trim()
      }

      // Replace the selected text with the edited version
      const newContent = content.substring(0, selection.start) + editedText + content.substring(selection.end)
      updateContent(newContent)

      // Position cursor at end of inserted content
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = selection.start + editedText.length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newPos, newPos)
        }
      }, 0)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsAiLoading(false)
      setSelectionEditMode(false)
      setSelectionEditPrompt("")
      setSelection(null)
    }
  }

  const cancelSelectionEdit = () => {
    setSelectionEditMode(false)
    setSelectionEditPrompt("")
    setSelection(null)
    textareaRef.current?.focus()
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart

    // Check if "/" was just typed to open AI assist
    if (newValue.length > content.length) {
      const typedChar = newValue[cursorPos - 1]
      if (typedChar === "/") {
        // Check if it's at start of line or after whitespace
        const charBefore = cursorPos > 1 ? newValue[cursorPos - 2] : "\n"
        if (charBefore === "\n" || charBefore === " " || cursorPos === 1) {
          // Remove the "/" and open dialog
          const contentWithoutSlash = newValue.substring(0, cursorPos - 1) + newValue.substring(cursorPos)
          updateContent(contentWithoutSlash)
          setCursorPosition(cursorPos - 1)
          setShowAiAssistDialog(true)
          setAiAssistPrompt("")
          setTimeout(() => {
            aiAssistInputRef.current?.focus()
          }, 0)
          return
        }
      }
    }

    updateContent(newValue)
  }

  const handleEditorKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // No special key handling needed anymore - dialogs handle their own keys
  }

  const formatActions = [
    { icon: Bold, label: "Bold", action: () => insertFormatting("**") },
    { icon: Italic, label: "Italic", action: () => insertFormatting("*") },
    { icon: Code, label: "Code", action: () => insertFormatting("`") },
    { icon: List, label: "Bullet List", action: () => insertAtCursor("\n- ") },
    { icon: ListOrdered, label: "Numbered List", action: () => insertAtCursor("\n1. ") },
  ]

  const selectedGroup = groups.find(g => g.id === groupId)

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-secondary)] bg-[var(--bg-elevated)]/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">{isEditing ? "Edit Prompt" : "New Prompt"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Prompt"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              placeholder="Give your prompt a name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
            />
          </div>

          {/* Group Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Group <span className="text-[var(--text-quaternary)] font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setGroupId("")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  !groupId
                    ? "border-[var(--text-primary)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)]"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                No Group
              </button>
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setGroupId(group.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    groupId === group.id
                      ? "border-[var(--text-primary)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                      : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)]"
                  }`}
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${group.color}`} />
                  {group.name}
                </button>
              ))}
              <button
                onClick={() => setShowNewGroupForm(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border-primary)] text-sm text-[var(--text-tertiary)] hover:border-[var(--border-secondary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Group
              </button>
            </div>
            {showNewGroupForm && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                <div className="flex gap-1">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewGroupColor(color)}
                      className={`h-6 w-6 rounded-full ${color} ${
                        newGroupColor === color ? "ring-2 ring-offset-2 ring-[var(--text-primary)]" : ""
                      }`}
                    />
                  ))}
                </div>
                <Input
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="flex-1 h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newGroupName.trim()) {
                      const newId = onAddGroup({ name: newGroupName.trim(), color: newGroupColor })
                      setGroupId(newId)
                      setNewGroupName("")
                      setNewGroupColor(GROUP_COLORS[0])
                      setShowNewGroupForm(false)
                    } else if (e.key === "Escape") {
                      setShowNewGroupForm(false)
                      setNewGroupName("")
                    }
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!newGroupName.trim()}
                  onClick={() => {
                    if (newGroupName.trim()) {
                      const newId = onAddGroup({ name: newGroupName.trim(), color: newGroupColor })
                      setGroupId(newId)
                      setNewGroupName("")
                      setNewGroupColor(GROUP_COLORS[0])
                      setShowNewGroupForm(false)
                    }
                  }}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setShowNewGroupForm(false)
                    setNewGroupName("")
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Rich Text Editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt Content</label>
            <Card className="overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-1 border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-2 py-1.5">
                {formatActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon-sm"
                    onClick={action.action}
                    title={action.label}
                  >
                    <action.icon className="h-4 w-4" />
                  </Button>
                ))}
                <div className="mx-2 h-4 w-px bg-[var(--border-secondary)]" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Undo"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo"
                >
                  <Redo className="h-4 w-4" />
                </Button>
                <div className="mx-2 h-4 w-px bg-[var(--border-secondary)]" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openAiAssistDialog}
                  disabled={isAiLoading || showAiAssistDialog}
                  title="AI Assist (or type /)"
                  className="gap-1.5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs">AI Assist</span>
                </Button>
              </div>

              {/* Editor */}
              <div className="relative">
                <textarea
                  data-editor
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  onKeyDown={handleEditorKeyDown}
                  onSelect={handleSelectionChange}
                  onMouseUp={handleSelectionChange}
                  disabled={isAiLoading || selectionEditMode || showAiAssistDialog}
                  placeholder="Write your prompt here...

You can use markdown formatting:
- **bold** for emphasis
- *italic* for subtle emphasis
- `code` for technical terms
- Lists for structured instructions

Type / or click AI Assist to get help"
                  className={`w-full min-h-[300px] p-4 text-sm bg-[var(--bg-elevated)] placeholder:text-[var(--text-quaternary)] focus:outline-none resize-none font-mono leading-relaxed ${isAiLoading ? "opacity-50" : ""}`}
                />

                {/* Loading Indicator */}
                {isAiLoading && !showAiAssistDialog && !selectionEditMode && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-elevated)]/80">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </div>
                  </div>
                )}

                {/* AI Assist Dialog */}
                {showAiAssistDialog && (
                  <div className="absolute left-4 right-4 bottom-3 z-10">
                    <div className="rounded-lg border border-blue-500 bg-[var(--bg-elevated)] shadow-popover p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">AI Assist</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          ref={aiAssistInputRef}
                          value={aiAssistPrompt}
                          onChange={(e) => setAiAssistPrompt(e.target.value)}
                          placeholder="What would you like to write? e.g., 'Write a code review prompt'"
                          className="flex-1 h-9 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              submitAiAssist()
                            } else if (e.key === "Escape") {
                              e.preventDefault()
                              cancelAiAssist()
                            }
                          }}
                          disabled={isAiLoading}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={submitAiAssist}
                          disabled={!aiAssistPrompt.trim() || isAiLoading}
                        >
                          {isAiLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Generate"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelAiAssist}
                          disabled={isAiLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        Press Enter to generate, Escape to cancel
                      </p>
                    </div>
                  </div>
                )}

                {/* Selection Edit Menu */}
                {showSelectionMenu && selection && !selectionEditMode && !showAiAssistDialog && (
                  <div className="absolute left-4 right-4 bottom-3 z-10">
                    <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated)] shadow-popover px-2 py-1.5">
                      <div className="text-xs text-[var(--text-tertiary)] px-2">
                        {selection.text.length} chars selected
                      </div>
                      <div className="h-4 w-px bg-[var(--border-secondary)]" />
                      <button
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm hover:bg-[var(--bg-tertiary)] transition-colors"
                        onClick={startSelectionEdit}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                        <span>Edit with AI</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Selection Edit Input */}
                {selectionEditMode && selection && (
                  <div className="absolute left-4 right-4 bottom-3 z-10">
                    <div className="rounded-lg border border-blue-500 bg-[var(--bg-elevated)] shadow-popover p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Edit selected text</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          ref={selectionInputRef}
                          value={selectionEditPrompt}
                          onChange={(e) => setSelectionEditPrompt(e.target.value)}
                          placeholder="How should this text be changed?"
                          className="flex-1 h-9 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              submitSelectionEdit()
                            } else if (e.key === "Escape") {
                              e.preventDefault()
                              cancelSelectionEdit()
                            }
                          }}
                          disabled={isAiLoading}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={submitSelectionEdit}
                          disabled={!selectionEditPrompt.trim() || isAiLoading}
                        >
                          {isAiLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelSelectionEdit}
                          disabled={isAiLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="mt-2 p-2 rounded bg-[var(--bg-tertiary)] max-h-20 overflow-y-auto">
                        <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">{selection.text}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)] px-3 py-2">
                <Caption tone="tertiary">
                  {content.length} characters
                </Caption>
                <Caption tone="tertiary">
                  Markdown supported
                </Caption>
              </div>
            </Card>
          </div>

          {/* Version Note - only show when editing and content changed */}
          {isEditing && hasContentChanged && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Version Note <span className="text-[var(--text-quaternary)] font-normal">(optional)</span>
              </label>
              <Input
                placeholder="Describe what changed..."
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
              />
              <p className="text-xs text-[var(--text-tertiary)]">
                This will be saved in the version history
              </p>
            </div>
          )}

          {/* Tips - only show when creating new */}
          {!isEditing && (
            <Card className="p-4 bg-[var(--bg-secondary)]">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                <div>
                  <Body className="font-medium mb-1">Tips for effective prompts</Body>
                  <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                    <li>Be specific about the role or persona you want the AI to assume</li>
                    <li>Include context about your use case or desired output format</li>
                    <li>Add examples when possible to guide the response style</li>
                    <li>Use clear, structured instructions for complex tasks</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Preview */}
          {content && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  {selectedGroup && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                      <div className={`h-2 w-2 rounded-full ${selectedGroup.color}`} />
                      {selectedGroup.name}
                    </div>
                  )}
                </div>
                <h3 className="font-medium mb-2">{title || "Untitled Prompt"}</h3>
                <Body tone="secondary" size="sm" className="whitespace-pre-wrap">
                  {content}
                </Body>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Keep backward compatibility
export { PromptEditor as NewPrompt }
