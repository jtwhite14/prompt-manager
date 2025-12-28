import { useState } from "react"
import { Login } from "@/pages/Login"
import { SignUp } from "@/pages/SignUp"
import { Home } from "@/pages/Home"
import { PromptEditor } from "@/pages/PromptEditor"
import { PromptView } from "@/pages/PromptView"

type Page = "login" | "signup" | "home" | "prompt-editor" | "view-prompt"

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

const INITIAL_GROUPS: Group[] = [
  { id: "1", name: "Work", promptCount: 2, color: "bg-blue-500" },
  { id: "2", name: "Personal", promptCount: 1, color: "bg-green-500" },
  { id: "3", name: "Development", promptCount: 1, color: "bg-purple-500" },
]

const INITIAL_PROMPTS: Prompt[] = [
  {
    id: "1",
    title: "Code Review Assistant",
    content: "You are a senior software engineer conducting a code review. Analyze the following code for bugs, performance issues, security vulnerabilities, and adherence to best practices. Provide specific, actionable feedback.",
    category: "Development",
    createdAt: "Dec 20, 2024",
    updatedAt: "2 hours ago",
    isFavorite: true,
    groupId: "3",
    versions: [
      {
        id: "v3",
        content: "You are a senior software engineer conducting a code review. Analyze the following code for bugs, performance issues, security vulnerabilities, and adherence to best practices. Provide specific, actionable feedback.",
        createdAt: "2 hours ago",
        note: "Added security review"
      },
      {
        id: "v2",
        content: "You are a senior software engineer conducting a code review. Analyze the following code for bugs, performance issues, and adherence to best practices. Provide specific, actionable feedback.",
        createdAt: "Dec 22, 2024",
        note: "Improved specificity"
      },
      {
        id: "v1",
        content: "You are a code reviewer. Review the following code and provide feedback.",
        createdAt: "Dec 20, 2024",
        note: "Initial version"
      },
    ]
  },
  {
    id: "2",
    title: "Creative Writing Partner",
    content: "You are a creative writing assistant specializing in storytelling. Help me develop compelling narratives with rich characters, engaging plots, and vivid descriptions. Ask clarifying questions to understand my vision.",
    category: "Writing",
    createdAt: "Dec 18, 2024",
    updatedAt: "Yesterday",
    isFavorite: false,
    groupId: "2",
    versions: [
      {
        id: "v1",
        content: "You are a creative writing assistant specializing in storytelling. Help me develop compelling narratives with rich characters, engaging plots, and vivid descriptions. Ask clarifying questions to understand my vision.",
        createdAt: "Dec 18, 2024",
        note: "Initial version"
      },
    ]
  },
  {
    id: "3",
    title: "Data Analysis Expert",
    content: "You are a data analyst with expertise in statistical analysis and visualization. Help me interpret datasets, identify trends, and create meaningful insights. Explain complex concepts in simple terms.",
    category: "Analytics",
    createdAt: "Dec 15, 2024",
    updatedAt: "3 days ago",
    isFavorite: true,
    groupId: "1",
    versions: [
      {
        id: "v2",
        content: "You are a data analyst with expertise in statistical analysis and visualization. Help me interpret datasets, identify trends, and create meaningful insights. Explain complex concepts in simple terms.",
        createdAt: "3 days ago",
        note: "Added visualization expertise"
      },
      {
        id: "v1",
        content: "You are a data analyst. Help me interpret datasets and identify trends.",
        createdAt: "Dec 15, 2024",
        note: "Initial version"
      },
    ]
  },
  {
    id: "4",
    title: "Meeting Summarizer",
    content: "Summarize the following meeting transcript into key points, action items, and decisions made. Format the output with clear sections and bullet points for easy scanning.",
    category: "Productivity",
    createdAt: "Dec 10, 2024",
    updatedAt: "1 week ago",
    isFavorite: false,
    groupId: "1",
    versions: [
      {
        id: "v1",
        content: "Summarize the following meeting transcript into key points, action items, and decisions made. Format the output with clear sections and bullet points for easy scanning.",
        createdAt: "Dec 10, 2024",
        note: "Initial version"
      },
    ]
  },
  {
    id: "5",
    title: "Email Draft Assistant",
    content: "Help me write professional emails that are clear, concise, and appropriate for the context. Match the tone to the recipient and purpose. Suggest improvements for clarity and impact.",
    category: "Communication",
    createdAt: "Dec 10, 2024",
    updatedAt: "1 week ago",
    isFavorite: true,
    versions: [
      {
        id: "v1",
        content: "Help me write professional emails that are clear, concise, and appropriate for the context. Match the tone to the recipient and purpose. Suggest improvements for clarity and impact.",
        createdAt: "Dec 10, 2024",
        note: "Initial version"
      },
    ]
  },
]

function App() {
  const [page, setPage] = useState<Page>("login")
  const [userName] = useState("John Doe")
  const [prompts, setPrompts] = useState<Prompt[]>(INITIAL_PROMPTS)
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)

  const handleLogin = () => {
    setPage("home")
  }

  const handleSignUp = () => {
    setPage("home")
  }

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
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    if (editingPromptId) {
      // Editing existing prompt
      handleUpdatePrompt(editingPromptId, prompt, versionNote)
      setEditingPromptId(null)
      setSelectedPromptId(editingPromptId)
      setPage("view-prompt")
    } else {
      // Creating new prompt
      const newPrompt: Prompt = {
        id: Date.now().toString(),
        title: prompt.title,
        content: prompt.content,
        category: "General",
        createdAt: now,
        updatedAt: "Just now",
        isFavorite: false,
        groupId: prompt.groupId,
        versions: [
          {
            id: "v1",
            content: prompt.content,
            createdAt: now,
            note: "Initial version"
          }
        ]
      }
      setPrompts((prev) => [newPrompt, ...prev])
      setPage("home")
    }
  }

  const handleUpdatePrompt = (promptId: string, updates: { title?: string; content?: string; groupId?: string }, versionNote?: string) => {
    setPrompts((prev) =>
      prev.map((p) => {
        if (p.id !== promptId) return p

        const newVersions = [...p.versions]
        if (updates.content && updates.content !== p.content) {
          newVersions.unshift({
            id: `v${newVersions.length + 1}`,
            content: updates.content,
            createdAt: "Just now",
            note: versionNote || "Updated"
          })
        }

        return {
          ...p,
          ...updates,
          updatedAt: "Just now",
          versions: newVersions
        }
      })
    )
  }

  const handleRestoreVersion = (promptId: string, versionId: string) => {
    setPrompts((prev) =>
      prev.map((p) => {
        if (p.id !== promptId) return p

        const version = p.versions.find(v => v.id === versionId)
        if (!version) return p

        const newVersions = [
          {
            id: `v${p.versions.length + 1}`,
            content: version.content,
            createdAt: "Just now",
            note: `Restored from ${versionId}`
          },
          ...p.versions
        ]

        return {
          ...p,
          content: version.content,
          updatedAt: "Just now",
          versions: newVersions
        }
      })
    )
  }

  const handleAddGroup = (group: Omit<Group, "id" | "promptCount">): string => {
    const newId = Date.now().toString()
    const newGroup: Group = {
      id: newId,
      name: group.name,
      color: group.color,
      promptCount: 0,
    }
    setGroups((prev) => [...prev, newGroup])
    return newId
  }

  const handleEditGroup = (groupId: string, data: { name: string; color: string }) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...data } : g))
    )
  }

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
    setPrompts((prev) =>
      prev.map((p) => (p.groupId === groupId ? { ...p, groupId: undefined } : p))
    )
  }

  const handleDeletePrompt = (promptId: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== promptId))
  }

  const handleToggleFavorite = (promptId: string) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === promptId ? { ...p, isFavorite: !p.isFavorite } : p))
    )
  }

  const handleDuplicatePrompt = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId)
    if (!prompt) return

    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const newPrompt: Prompt = {
      id: Date.now().toString(),
      title: `${prompt.title} (Copy)`,
      content: prompt.content,
      category: prompt.category,
      createdAt: now,
      updatedAt: "Just now",
      isFavorite: false,
      groupId: prompt.groupId,
      versions: [
        {
          id: "v1",
          content: prompt.content,
          createdAt: now,
          note: `Duplicated from "${prompt.title}"`
        }
      ]
    }
    setPrompts((prev) => [newPrompt, ...prev])
    return newPrompt.id
  }

  if (page === "view-prompt" && selectedPromptId) {
    const prompt = prompts.find(p => p.id === selectedPromptId)
    if (prompt) {
      return (
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
      )
    }
  }

  if (page === "prompt-editor") {
    const editingPrompt = editingPromptId ? prompts.find(p => p.id === editingPromptId) : null
    return (
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
    )
  }

  if (page === "home") {
    return (
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
    )
  }

  if (page === "signup") {
    return (
      <SignUp
        onNavigateToLogin={() => setPage("login")}
        onSignUp={handleSignUp}
      />
    )
  }

  return (
    <Login
      onNavigateToSignUp={() => setPage("signup")}
      onLogin={handleLogin}
    />
  )
}

export default App
