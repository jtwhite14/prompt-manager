import { useState, useRef, useEffect } from "react"
import { Send, Sparkles, X, Copy, Check, ArrowDownToLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Caption } from "@/components/ui/typography"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface AIChatPanelProps {
  isOpen: boolean
  onClose: () => void
  currentPrompt: { title: string; content: string }
  onInsertPrompt: (content: string) => void
}

export function AIChatPanel({ isOpen, onClose, currentPrompt, onInsertPrompt }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm here to help you create an effective prompt. Tell me what you want your prompt to accomplish, or share what you have so far and I'll suggest improvements."
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const extractPromptFromMessage = (content: string): string | null => {
    // Look for code blocks labeled as PROMPT:
    const promptMatch = content.match(/```(?:PROMPT:?)?\s*\n([\s\S]*?)```/i)
    if (promptMatch) {
      return promptMatch[1].trim()
    }
    // Also check for PROMPT: label without code block
    const labelMatch = content.match(/PROMPT:\s*\n([\s\S]*?)(?:\n\n|$)/i)
    if (labelMatch) {
      return labelMatch[1].trim()
    }
    return null
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages.filter(m => m.id !== "welcome"), userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          currentPrompt
        })
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't connect to the AI service. Make sure the server is running with `node server.js`."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleInsertPrompt = (content: string) => {
    const extracted = extractPromptFromMessage(content)
    if (extracted) {
      onInsertPrompt(extracted)
    }
  }

  const renderMessageContent = (message: Message) => {
    const content = message.content
    const hasPrompt = extractPromptFromMessage(content)

    // Simple markdown-like rendering
    const parts = content.split(/(```[\s\S]*?```)/g)

    return (
      <div className="space-y-2">
        {parts.map((part, index) => {
          if (part.startsWith("```")) {
            const codeContent = part.replace(/```(?:PROMPT:?)?\s*\n?/gi, "").replace(/```$/g, "").trim()
            return (
              <div key={index} className="relative group">
                <pre className="bg-[var(--bg-tertiary)] rounded-md p-3 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                  {codeContent}
                </pre>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copyToClipboard(codeContent, `${message.id}-${index}`)}
                    title="Copy"
                  >
                    {copiedId === `${message.id}-${index}` ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )
          }
          return (
            <p key={index} className="whitespace-pre-wrap text-sm leading-relaxed">
              {part}
            </p>
          )
        })}
        {message.role === "assistant" && hasPrompt && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => handleInsertPrompt(content)}
          >
            <ArrowDownToLine className="h-3 w-3 mr-1.5" />
            Insert into editor
          </Button>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <Card className="overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="font-medium text-sm">AI Assistant</p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="h-[250px] overflow-y-auto p-4 space-y-4 bg-[var(--bg-elevated)]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {message.role === "assistant" ? (
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            ) : (
              <Avatar name="You" size="sm" />
            )}
            <div
              className={`flex-1 max-w-[85%] ${
                message.role === "user"
                  ? "bg-[var(--bg-tertiary)] rounded-2xl rounded-tr-sm px-4 py-2"
                  : ""
              }`}
            >
              {renderMessageContent(message)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <div className="flex items-center gap-1 py-2">
              <div className="w-2 h-2 bg-[var(--text-quaternary)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-[var(--text-quaternary)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-[var(--text-quaternary)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)]">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for help with your prompt..."
            rows={2}
            className="w-full resize-none rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 pr-12 text-sm placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <Button
            variant="primary"
            size="icon-sm"
            className="absolute right-2 bottom-2"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Caption tone="tertiary" className="mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </Caption>
      </div>
    </Card>
  )
}
