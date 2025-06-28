// Chat helpers for Mastra integration
// TDD Green phase - minimal implementation to make tests pass

import { createChatSession, addChatMessage } from '@/actions/chat';
import { generateNextQuestion, analyzeConversationDepth } from '@/actions/ai-conversation';
import { getGoal } from '@/actions/goals';
import type { ChatMessage } from '@/types/mastra';

export interface ChatInitResult {
  sessionId: string;
  welcomeMessage: string;
  firstQuestion: string;
}

export interface MessageResult {
  aiResponse: string;
  conversationDepth: number;
  isComplete: boolean;
  // AI駆動動的フロー制御の結果
  informationSufficiency?: number;
  conversationQuality?: 'low' | 'medium' | 'high';
  suggestedNextAction?: 'continue_conversation' | 'proceed_to_planning' | 'clarify_goal';
  reasoning?: string;
}

export interface ConversationStatus {
  isComplete: boolean;
  currentDepth: number;
  maxDepth: number;
  completionPercentage: number;
}

export interface Goal {
  id: string;
  title: string;
  userId: string;
}

export async function initializeChatWithMastra(
  goalId: string,
  userId: string
): Promise<ChatInitResult> {
  // Get goal data
  const goalResult = await getGoal(goalId, userId);
  if (!goalResult.success) {
    throw new Error('Goal not found');
  }

  // Create chat session
  const sessionResult = await createChatSession({
    goalId,
    status: 'active',
  });

  if (!sessionResult.success) {
    throw new Error('Failed to create chat session');
  }

  const welcomeMessage = `こんにちは！「${goalResult.data.title}」という夢の実現に向けて、最高の計画を一緒に作りましょう。`;

  // Generate first question
  const questionResult = await generateNextQuestion(goalId, userId, []);
  if (!questionResult.success) {
    throw new Error('Failed to generate first question');
  }

  return {
    sessionId: sessionResult.data.id,
    welcomeMessage,
    firstQuestion: questionResult.data.question,
  };
}

export async function handleUserMessage(
  sessionId: string,
  goalId: string,
  userId: string,
  userMessage: string,
  chatHistory: ChatMessage[]
): Promise<MessageResult> {
  // Save user message to database
  await addChatMessage({
    sessionId,
    content: userMessage,
    senderType: 'user',
    messageOrder: chatHistory.length,
  });

  // Add user message to chat history
  const updatedHistory = [
    ...chatHistory,
    { role: 'user', content: userMessage }
  ];

  // 並列でAI分析と質問生成を実行
  console.log('🔍 Debug: Starting AI analysis and question generation...');
  console.log('📝 Chat history length:', updatedHistory.length);
  console.log('🎯 Goal ID:', goalId, 'User ID:', userId);
  
  const [questionResult, analysisResult] = await Promise.all([
    generateNextQuestion(goalId, userId, updatedHistory),
    analyzeConversationDepth(updatedHistory, { id: goalId, userId } as any)
  ]);

  console.log('🔍 Question Result:', questionResult.success ? 'SUCCESS' : 'FAILED');
  console.log('🔍 Analysis Result:', analysisResult.success ? 'SUCCESS' : 'FAILED');
  
  if (!questionResult.success) {
    console.error('❌ Question generation failed:', questionResult.error);
    throw new Error('Failed to generate AI response');
  }
  
  if (!analysisResult.success) {
    console.error('❌ Analysis failed:', analysisResult.error);
  }

  // Save AI message to database
  await addChatMessage({
    sessionId,
    content: questionResult.data.question,
    senderType: 'ai',
    messageOrder: updatedHistory.length,
  });

  // AI分析結果から動的フロー制御の値を取得
  const analysis = analysisResult.success ? analysisResult.data : null;
  
  console.log('📊 Analysis data:', analysis);
  console.log('🤖 Question data:', questionResult.data);
  
  const result = {
    aiResponse: questionResult.data.question,
    conversationDepth: questionResult.data.depth + 1,
    isComplete: questionResult.data.shouldComplete || (analysis?.isReadyToProceed ?? false),
    // AI駆動動的フロー制御の結果
    informationSufficiency: analysis?.informationSufficiency ?? 0.3,
    conversationQuality: analysis?.conversationQuality ?? 'medium',
    suggestedNextAction: analysis?.suggestedNextAction ?? 'continue_conversation',
    reasoning: analysis?.reasoning ?? questionResult.data.reasoning ?? '会話を続けて、より詳しい情報を集めましょう',
  };
  
  console.log('📤 Returning result:', result);
  return result;
}

export async function isConversationComplete(
  chatHistory: ChatMessage[],
  _goal: Goal
): Promise<ConversationStatus> {
  const maxDepth = 5;
  const currentDepth = Math.floor(chatHistory.length / 2); // Rough estimate
  const completionPercentage = Math.min(100, (currentDepth / maxDepth) * 100);

  return {
    isComplete: currentDepth >= maxDepth,
    currentDepth,
    maxDepth,
    completionPercentage,
  };
}