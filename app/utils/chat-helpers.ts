// Chat helpers for Mastra integration
// TDD Green phase - minimal implementation to make tests pass

import { createChatSession, addChatMessage } from '@/actions/chat';
import { generateNextQuestion } from '@/actions/ai-conversation';
import { getGoal } from '@/actions/goals';

export interface ChatInitResult {
  sessionId: string;
  welcomeMessage: string;
  firstQuestion: string;
}

export interface MessageResult {
  aiResponse: string;
  conversationDepth: number;
  isComplete: boolean;
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

export interface ChatMessage {
  role: string;
  content: string;
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

  // Generate AI response
  const questionResult = await generateNextQuestion(goalId, userId, updatedHistory);
  if (!questionResult.success) {
    throw new Error('Failed to generate AI response');
  }

  // Save AI message to database
  await addChatMessage({
    sessionId,
    content: questionResult.data.question,
    senderType: 'ai',
    messageOrder: updatedHistory.length,
  });

  return {
    aiResponse: questionResult.data.question,
    conversationDepth: questionResult.data.depth + 1,
    isComplete: questionResult.data.depth >= 4, // Simple completion logic
  };
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