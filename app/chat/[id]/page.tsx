'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PaperPlaneIcon,
  PersonIcon,
} from '@radix-ui/react-icons';
import { useSession } from 'next-auth/react';
import {
  initializeChatWithMastra,
  handleUserMessage,
} from '@/app/utils/chat-helpers';
import type { ChatMessage } from '@/types/mastra';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  type?: 'question' | 'confirmation' | 'suggestion';
  options?: string[];
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [goalId, setGoalId] = useState<string>('');
  const [_goalTitle, setGoalTitle] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatSessionId, setChatSessionId] = useState<string>('');
  const [_conversationComplete, setConversationComplete] = useState(false);
  const [conversationDepth, setConversationDepth] = useState(0);
  const [_maxDepth] = useState(5);
  const [showSuggestion, setShowSuggestion] = useState(false);
  // AI駆動動的フロー制御の状態
  const [informationSufficiency, setInformationSufficiency] = useState(0);
  const [conversationQuality, setConversationQuality] = useState<
    'low' | 'medium' | 'high'
  >('low');
  const [suggestedNextAction, setSuggestedNextAction] = useState<
    'continue_conversation' | 'proceed_to_planning' | 'clarify_goal'
  >('continue_conversation');
  const [reasoning, setReasoning] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat session with Mastra integration
  useEffect(() => {
    const abortController = new AbortController();
    let initializationAttempted = false;
    
    const initializeChat = async () => {
      try {
        console.log('🔍 initializeChat called:', {
          isInitialized,
          initializationRef: initializationRef.current,
          sessionStatus: status,
          hasUserId: !!session?.user?.id,
          aborted: abortController.signal.aborted,
          attemptedThisRun: initializationAttempted
        });

        // AbortSignalチェック
        if (abortController.signal.aborted) {
          console.log('🚫 Operation aborted before starting');
          return;
        }

        // 重複初期化防止（このuseEffect内での実行チェック）
        if (initializationAttempted) {
          console.log('🛡️ Already attempted initialization in this useEffect run');
          return;
        }

        // グローバル重複初期化防止
        if (isInitialized || initializationRef.current) {
          console.log('⚠️ Chat already initialized globally, skipping...');
          return;
        }

        if (status === 'loading') {
          console.log('🔄 Session still loading, waiting...');
          return;
        }

        if (status === 'unauthenticated' || !session?.user?.id) {
          console.log('❌ Not authenticated, redirecting...');
          router.push('/');
          return;
        }

        // 実行フラグを設定（このuseEffect内での重複防止）
        initializationAttempted = true;
        // グローバルフラグを設定（他のuseEffectからの重複防止）
        initializationRef.current = true;
        
        const resolvedParams = await params;
        const paramGoalId = resolvedParams.id;
        setGoalId(paramGoalId);

        // AbortSignalチェック（非同期処理前）
        if (abortController.signal.aborted) {
          console.log('🚫 Operation aborted before API call');
          initializationRef.current = false;
          return;
        }

        console.log('🚀 Starting chat initialization for goal:', paramGoalId);

        // Initialize chat with Mastra
        const chatInit = await initializeChatWithMastra(
          paramGoalId,
          session.user.id,
        );

        // AbortSignalチェック（API呼び出し後）
        if (abortController.signal.aborted) {
          console.log('🚫 Operation aborted after API call');
          initializationRef.current = false;
          return;
        }

        console.log('✅ Chat initialization completed successfully');

        setChatSessionId(chatInit.sessionId);
        // Save session ID for plan generation
        localStorage.setItem(
          `chatSessionId_${paramGoalId}`,
          chatInit.sessionId,
        );
        setGoalTitle(
          chatInit.welcomeMessage.split('「')[1]?.split('」')[0] || '',
        );

        // Set initial messages
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: 'ai',
          content: chatInit.welcomeMessage,
          timestamp: new Date(),
          type: 'question',
        };

        const firstQuestion: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: chatInit.firstQuestion,
          timestamp: new Date(),
          type: 'question',
        };

        setMessages([welcomeMessage, firstQuestion]);
        setIsInitialized(true);
        setIsLoading(false);
      } catch (error) {
        if (abortController.signal.aborted) {
          console.log('🚫 Chat initialization aborted during error handling');
          return;
        }
        console.error('❌ Error initializing chat:', error);
        setError('チャットの初期化に失敗しました');
        setIsLoading(false);
        // エラー時はフラグをリセット
        initializationRef.current = false;
      }
    };

    // セッションが確定してからのみ実行
    if (session && status === 'authenticated' && !isInitialized) {
      initializeChat();
    }

    // クリーンアップ関数でAbortController実行
    return () => {
      console.log('🧹 Cleaning up chat initialization, aborting any pending operations');
      abortController.abort();
      // Strict Modeでの2回目の実行を防ぐため、初期化が完了していない場合のみリセット
      if (!isInitialized) {
        initializationRef.current = false;
      }
    };
  }, [params, session]); // status, routerを依存関係から削除、isInitializedを追加

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !chatSessionId || !goalId || !session?.user?.id)
      return;

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Convert UI messages to ChatMessage format for helpers
      const currentChatHistory: ChatMessage[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add the new user message to history
      currentChatHistory.push({ role: 'user', content: content.trim() });

      // Handle message with Mastra
      const result = await handleUserMessage(
        chatSessionId,
        goalId,
        session.user.id,
        content.trim(),
        currentChatHistory,
      );

      // Add AI response to UI
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: result.aiResponse,
        timestamp: new Date(),
        type: 'question',
      };

      setMessages((prev) => [...prev, aiMessage]);
      setConversationDepth(result.conversationDepth);
      setConversationComplete(result.isComplete);

      // AI駆動動的フロー制御の状態更新
      if (result.informationSufficiency !== undefined) {
        setInformationSufficiency(result.informationSufficiency);
      }
      if (result.conversationQuality) {
        setConversationQuality(result.conversationQuality);
      }
      if (result.suggestedNextAction) {
        setSuggestedNextAction(result.suggestedNextAction);
      }
      if (result.reasoning) {
        setReasoning(result.reasoning);
      }

      // AI駆動の提案表示判定
      if (
        result.suggestedNextAction === 'proceed_to_planning' ||
        (result.informationSufficiency && result.informationSufficiency >= 0.7)
      ) {
        setTimeout(() => {
          setShowSuggestion(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      setError('メッセージの処理に失敗しました');
    } finally {
      setIsTyping(false);
    }
  };

  const handleOptionClick = (option: string) => {
    handleSendMessage(option);
  };

  const handleCreatePlan = () => {
    router.push(`/plan-generation/${goalId}`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">AIによる分析中...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>再試行</Button>
        </div>
      </div>
    );
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
                情報充実度: {Math.round(informationSufficiency * 100)}% |{' '}
                {conversationQuality}
              </p>
            </div>
          </div>
          <div className="w-20 h-3 bg-gray-200 rounded-full">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                informationSufficiency >= 0.8
                  ? 'bg-green-600'
                  : informationSufficiency >= 0.5
                    ? 'bg-blue-600'
                    : 'bg-yellow-600'
              }`}
              style={{ width: `${informationSufficiency * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-indigo-600 ml-2'
                    : 'bg-gray-200 mr-2'
                }`}
              >
                {message.role === 'user' ? (
                  <PersonIcon className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div>
                <Card
                  className={`${message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                >
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
                {message.type === 'suggestion' && (
                  <div className="mt-2 text-xs text-gray-500">
                    💡 ヒント:
                    上の選択肢をタップするか、自由にテキスト入力もできます
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
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* AI駆動動的提案表示 */}
        {(showSuggestion || suggestedNextAction === 'proceed_to_planning') && (
          <div className="flex justify-start mb-4">
            <div className="flex max-w-[85%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 mr-2 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-600">
                      情報充実度: {Math.round(informationSufficiency * 100)}%
                    </span>
                    <span className="text-xs text-blue-600 capitalize">
                      {conversationQuality} quality
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${informationSufficiency * 100}%` }}
                    ></div>
                  </div>
                </div>

                <p className="text-sm text-blue-800 mb-3">
                  💡{' '}
                  {reasoning ||
                    '十分な情報が集まりました！いつでも計画作成に進むことができます。'}
                </p>

                <div className="flex space-x-2">
                  {suggestedNextAction === 'proceed_to_planning' ? (
                    <Button
                      onClick={handleCreatePlan}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      計画を作成する
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSendMessage('')}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      続けて詳しく聞く
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setShowSuggestion(false);
                      setSuggestedNextAction('continue_conversation');
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    会話を続ける
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <footer className="bg-white border-t border-gray-200 p-4 space-y-3">
        {/* チャット入力フォーム - 常に表示 */}
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="テキストで回答を入力..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputValue);
              }
            }}
            disabled={isTyping}
          />
          <Button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            size="icon"
          >
            <PaperPlaneIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* 計画作成ボタン - AI分析に基づく動的表示 */}
        <Button
          onClick={handleCreatePlan}
          className={`w-full ${
            suggestedNextAction === 'proceed_to_planning' ||
            informationSufficiency >= 0.6
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-gray-400 hover:bg-gray-500'
          }`}
          disabled={informationSufficiency < 0.3}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {suggestedNextAction === 'proceed_to_planning'
            ? '計画を作成する（推奨）'
            : informationSufficiency >= 0.6
              ? 'この内容で計画を作成する'
              : `計画作成まで ${Math.round((0.6 - informationSufficiency) * 100)}% `}
        </Button>
      </footer>
    </div>
  );
}
