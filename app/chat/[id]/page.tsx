"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Bot, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, PaperPlaneIcon, PersonIcon } from "@radix-ui/react-icons"
import { useSession } from "next-auth/react"
import { initializeChatWithMastra, handleUserMessage, type ChatMessage } from "@/app/utils/chat-helpers"

interface Message {
  id: string
  role: "ai" | "user"
  content: string
  timestamp: Date
  type?: "question" | "confirmation" | "suggestion"
  options?: string[]
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [goalId, setGoalId] = useState<string>("")
  const [_goalTitle, setGoalTitle] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [chatSessionId, setChatSessionId] = useState<string>("")
  const [conversationComplete, setConversationComplete] = useState(false)
  const [conversationDepth, setConversationDepth] = useState(0)
  const [maxDepth] = useState(5)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize chat session with Mastra integration
  useEffect(() => {
    const initializeChat = async () => {
      try {
        if (status === 'loading') return
        
        if (status === 'unauthenticated' || !session?.user?.id) {
          router.push('/')
          return
        }

        const resolvedParams = await params
        const paramGoalId = resolvedParams.id
        setGoalId(paramGoalId)

        // Initialize chat with Mastra
        const chatInit = await initializeChatWithMastra(paramGoalId, session.user.id)
        
        setChatSessionId(chatInit.sessionId)
        // Save session ID for plan generation
        localStorage.setItem(`chatSessionId_${paramGoalId}`, chatInit.sessionId)
        setGoalTitle(chatInit.welcomeMessage.split('「')[1]?.split('」')[0] || '')

        // Set initial messages
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: "ai",
          content: chatInit.welcomeMessage,
          timestamp: new Date(),
          type: "question",
        }

        const firstQuestion: Message = {
          id: (Date.now() + 1).toString(),
          role: "ai", 
          content: chatInit.firstQuestion,
          timestamp: new Date(),
          type: "question",
        }

        setMessages([welcomeMessage, firstQuestion])
        setIsLoading(false)

      } catch (error) {
        console.error('Error initializing chat:', error)
        setError('チャットの初期化に失敗しました')
        setIsLoading(false)
      }
    }

    initializeChat()
  }, [params, session, status, router])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !chatSessionId || !goalId || !session?.user?.id) return

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    try {
      // Convert UI messages to ChatMessage format for helpers
      const currentChatHistory: ChatMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Add the new user message to history
      currentChatHistory.push({ role: 'user', content: content.trim() })

      // Handle message with Mastra
      const result = await handleUserMessage(
        chatSessionId,
        goalId,
        session.user.id,
        content.trim(),
        currentChatHistory
      )

      // Add AI response to UI
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: result.aiResponse,
        timestamp: new Date(),
        type: "question",
      }

      setMessages((prev) => [...prev, aiMessage])
      setConversationDepth(result.conversationDepth)
      setConversationComplete(result.isComplete)

      if (result.isComplete) {
        // Show create plan button when conversation is complete
        setTimeout(() => {
          setConversationComplete(true)
        }, 1000)
      }

    } catch (error) {
      console.error('Error handling message:', error)
      setError('メッセージの処理に失敗しました')
    } finally {
      setIsTyping(false)
    }
  }

  const handleOptionClick = (option: string) => {
    handleSendMessage(option)
  }

  const handleCreatePlan = () => {
    router.push(`/plan-generation/${goalId}`)
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">チャットを初期化中...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            再試行
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeftIcon className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">AIヒアリング</h1>
              <p className="text-sm text-gray-600">
                ({conversationDepth}/{maxDepth})
              </p>
            </div>
          </div>
          <div className="w-16 h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${(conversationDepth / maxDepth) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === "user" ? "bg-indigo-600 ml-2" : "bg-gray-200 mr-2"
                }`}
              >
                {message.role === "user" ? (
                  <PersonIcon className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div>
                <Card className={`${message.role === "user" ? "bg-indigo-600 text-white" : "bg-white"}`}>
                  <CardContent className="p-3">
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </CardContent>
                </Card>
                {message.options && (
                  <div className="mt-2 space-y-2">
                    {message.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left"
                        onClick={() => handleOptionClick(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}
                {message.type === "suggestion" && (
                  <div className="mt-2 text-xs text-gray-500">
                    💡 ヒント: 上の選択肢をタップするか、自由にテキスト入力もできます
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 mr-2 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <Card className="bg-white">
                <CardContent className="p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer className="bg-white border-t border-gray-200 p-4">
        {conversationComplete ? (
          <Button onClick={handleCreatePlan} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            この内容で計画を作成する
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="テキストで回答を入力..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(inputValue)
                }
              }}
              disabled={isTyping}
            />
            <Button onClick={() => handleSendMessage(inputValue)} disabled={!inputValue.trim() || isTyping} size="icon">
              <PaperPlaneIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
      </footer>
    </div>
  )
}
