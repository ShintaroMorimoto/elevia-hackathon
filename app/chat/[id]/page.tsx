'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatSessionId, setChatSessionId] = useState<string>('');
  const [_conversationComplete, setConversationComplete] = useState(false);
  const [_conversationDepth, setConversationDepth] = useState(0);
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
  const [isInitializing, setIsInitializing] = useState(true);
  const initializationRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // Mock progress calculation based on user message count
  useEffect(() => {
    const userMessages = messages.filter((msg) => msg.role === 'user');
    const mockProgress = Math.min(1, userMessages.length * 0.2); // 20% per message, max 100%
    setInformationSufficiency(mockProgress);

    // Update conversation quality based on progress
    if (mockProgress >= 0.8) {
      setConversationQuality('high');
    } else if (mockProgress >= 0.4) {
      setConversationQuality('medium');
    } else {
      setConversationQuality('low');
    }

    // Suggest planning when progress >= 70%
    if (mockProgress >= 0.7) {
      setSuggestedNextAction('proceed_to_planning');
      setReasoning(
        '十分な情報が集まりました！計画作成に進むことをお勧めします。',
      );
    }
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
          attemptedThisRun: initializationAttempted,
        });

        // AbortSignalチェック
        if (abortController.signal.aborted) {
          console.log('🚫 Operation aborted before starting');
          return;
        }

        // 重複初期化防止（このuseEffect内での実行チェック）
        if (initializationAttempted) {
          console.log(
            '🛡️ Already attempted initialization in this useEffect run',
          );
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
        setIsInitializing(false);
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
      console.log(
        '🧹 Cleaning up chat initialization, aborting any pending operations',
      );
      abortController.abort();
      // Strict Modeでの2回目の実行を防ぐため、初期化が完了していない場合のみリセット
      if (!isInitialized) {
        initializationRef.current = false;
      }
    };
  }, [params, session, status, isInitialized, router]);

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

      // Mock progress is now handled by useEffect based on message count
      // AI駆動動的フロー制御の状態更新 - temporarily disabled for mock implementation
      // if (result.informationSufficiency !== undefined) {
      //   setInformationSufficiency(result.informationSufficiency);
      // }
      // if (result.conversationQuality) {
      //   setConversationQuality(result.conversationQuality);
      // }
      // if (result.suggestedNextAction) {
      //   setSuggestedNextAction(result.suggestedNextAction);
      // }
      // if (result.reasoning) {
      //   setReasoning(result.reasoning);
      // }

      // Show suggestion based on mock progress (handled by useEffect)
      const userMessages =
        messages.filter((msg) => msg.role === 'user').length + 1; // +1 for current message
      if (userMessages >= 4) {
        // Show after 4 messages (80% progress)
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
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-sunrise border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">AIによる分析中...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>再試行</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 flex flex-col">
      <header className="glass border-b border-white/20 px-6 py-4 sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-3">
                <ArrowLeftIcon className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-dawn to-primary-sunrise bg-clip-text text-transparent">
                AIヒアリング
              </h1>
              <p className="text-sm text-neutral-600">
                情報充実度:{' '}
                <span className="font-semibold text-primary-sunrise">
                  {Math.round(informationSufficiency * 100)}%
                </span>{' '}
                |{' '}
                <span
                  className={`font-medium capitalize ${
                    conversationQuality === 'high'
                      ? 'text-primary-sky'
                      : conversationQuality === 'medium'
                        ? 'text-primary-daylight'
                        : 'text-primary-sunrise'
                  }`}
                >
                  {conversationQuality} quality
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-32 space-y-6 max-w-4xl mx-auto w-full">
        {isInitializing && messages.length === 0 && (
          <div className="flex justify-start">
            <div className="flex">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-neutral-200 mr-3 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-primary-sunrise" />
              </div>
              <Card className="bg-white/90 backdrop-blur-sm border border-neutral-200 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary-sunrise rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-primary-sunrise rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <div
                        className="w-2 h-2 bg-primary-sunrise rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                    <span className="text-sm text-neutral-600 ml-2">
                      AIが最初の質問を準備中...
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                  message.role === 'user'
                    ? 'bg-primary-sunrise ml-3'
                    : 'bg-white border border-neutral-200 mr-3'
                }`}
              >
                {message.role === 'user' ? (
                  <PersonIcon className="w-5 h-5 text-neutral-800" />
                ) : (
                  <Bot className="w-5 h-5 text-primary-sunrise" />
                )}
              </div>
              <div>
                <Card
                  className={`${
                    message.role === 'user'
                      ? 'bg-primary-sunrise text-neutral-800 border-none shadow-lg'
                      : 'bg-white/90 backdrop-blur-sm border border-neutral-200 text-neutral-800 shadow-md'
                  }`}
                >
                  <CardContent className="p-4">
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </CardContent>
                </Card>
                {message.options && (
                  <div className="mt-2 space-y-2">
                    {message.options.map((option) => (
                      <Button
                        key={option}
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
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-neutral-200 mr-3 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-primary-sunrise" />
              </div>
              <Card className="bg-white/90 backdrop-blur-sm border border-neutral-200 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary-sunrise rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-primary-sunrise rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <div
                        className="w-2 h-2 bg-primary-sunrise rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                    <span className="text-sm text-neutral-600 ml-2">
                      考えています...
                    </span>
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
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-sunrise mr-3 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-neutral-800" />
              </div>
              <div className="bg-gradient-to-br from-primary-sunrise/10 to-primary-daylight/10 border border-primary-sunrise/20 rounded-xl p-5 backdrop-blur-sm">
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary-sunrise">
                      情報充実度: {Math.round(informationSufficiency * 100)}%
                    </span>
                    <span className="text-xs text-primary-sunrise capitalize font-medium">
                      {conversationQuality} quality
                    </span>
                  </div>
                </div>

                <p className="text-sm text-neutral-700 mb-4">
                  💡{' '}
                  {reasoning ||
                    '十分な情報が集まりました！いつでも計画作成に進むことができます。'}
                </p>

                <div className="flex space-x-3">
                  {suggestedNextAction === 'proceed_to_planning' ? (
                    <Button
                      onClick={handleCreatePlan}
                      size="sm"
                      variant="primary"
                    >
                      <Sparkles className="w-3 h-3 mr-1 text-neutral-800" />
                      計画を作成する
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSendMessage('')}
                      size="sm"
                      variant="primary"
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
                    className="text-primary-sunrise hover:text-primary-daylight"
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

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-200 p-4 space-y-3 z-40 backdrop-blur-md shadow-lg">
        <div className="max-w-4xl mx-auto w-full">
          {/* チャット入力フォーム - 常に表示 */}
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="テキストで回答を入力..."
              className="flex-1 min-h-[44px] text-base md:text-sm"
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
              className="min-h-[44px] min-w-[44px] px-3"
            >
              <PaperPlaneIcon className="w-5 h-5" />
            </Button>
          </div>

          {/* 手動計画作成ボタン - 常時表示 */}
          <Button
            onClick={handleCreatePlan}
            className={`w-full min-h-[48px] text-base font-medium ${
              suggestedNextAction === 'proceed_to_planning' ||
              informationSufficiency >= 0.6
                ? 'bg-primary-sunrise hover:bg-primary-daylight text-neutral-800'
                : 'bg-accent-purple hover:bg-primary-dawn text-neutral-800'
            }`}
            disabled={informationSufficiency < 0.2}
          >
            <Sparkles className="w-5 h-5 mr-2 text-neutral-800" />
            {suggestedNextAction === 'proceed_to_planning'
              ? '計画を作成する（推奨）'
              : informationSufficiency >= 0.6
                ? 'この内容で計画を作成する'
                : informationSufficiency >= 0.2
                  ? 'この内容でとりあえず計画作成'
                  : '情報不足のため作成不可'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
