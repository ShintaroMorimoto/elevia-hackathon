"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Bot, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, PaperPlaneIcon, PersonIcon } from "@radix-ui/react-icons"

interface Message {
  id: string
  role: "ai" | "user"
  content: string
  timestamp: Date
  type?: "question" | "confirmation" | "suggestion"
  options?: string[]
}

export default function ChatPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content:
        "こんにちは！「5年後に1億円稼ぐ」という壮大な夢、ワクワクしますね。最高の計画を一緒に作るために、いくつか質問させてください。",
      timestamp: new Date(),
      type: "question",
    },
    {
      id: "2",
      role: "ai",
      content:
        "最初の質問です。あなたがその夢を目指す、一番の「動機」は何ですか？例えば、自由な時間が欲しい、家族のため、社会に貢献したい、など自由に教えてください。",
      timestamp: new Date(),
      type: "question",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [totalSteps] = useState(5)
  const [showCreatePlanButton, setShowCreatePlanButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(content, currentStep)
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)

      if (currentStep < totalSteps) {
        setCurrentStep((prev) => prev + 1)
      } else {
        setShowCreatePlanButton(true)
      }
    }, 1500)
  }

  const generateAIResponse = (userInput: string, step: number): Message => {
    const responses = [
      {
        content:
          "なるほど、「時間や場所に縛られない自由な生き方を手に入れたい」という気持ちが強い、という理解で合っていますか？",
        type: "confirmation" as const,
        options: ["はい、その通りです", "いいえ、少し違います"],
      },
      {
        content:
          "素晴らしい動機ですね！次に、現在のあなたのスキルや経験について教えてください。どんな分野で働いていますか？",
        type: "question" as const,
      },
      {
        content: "その目標を達成するために、どんな「手段」に興味がありますか？",
        type: "suggestion" as const,
        options: ["起業・独立", "副業", "投資", "転職"],
      },
      {
        content: "1億円を稼いだ後、どんな生活を送りたいですか？具体的にイメージしてみてください。",
        type: "question" as const,
      },
      {
        content: "最後の質問です。この目標達成のために、どのくらいの時間を週に投資できますか？",
        type: "question" as const,
      },
    ]

    return {
      id: Date.now().toString(),
      role: "ai",
      content: responses[step - 1]?.content || "ありがとうございます！十分な情報が集まりました。",
      timestamp: new Date(),
      type: responses[step - 1]?.type,
      options: responses[step - 1]?.options,
    }
  }

  const handleOptionClick = (option: string) => {
    handleSendMessage(option)
  }

  const handleCreatePlan = () => {
    router.push("/plan-generation/1")
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
                ({currentStep}/{totalSteps})
              </p>
            </div>
          </div>
          <div className="w-16 h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
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
        {showCreatePlanButton ? (
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
