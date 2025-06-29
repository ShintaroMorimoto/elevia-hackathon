import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeChatWithMastra, handleUserMessage, isConversationComplete } from '@/app/utils/chat-helpers';

// Mock Server Actions for isolated testing
vi.mock('@/actions/chat', () => ({
  createChatSession: vi.fn(),
  addChatMessage: vi.fn(),
}));

vi.mock('@/actions/ai-conversation', () => ({
  generateNextQuestion: vi.fn(),
  analyzeConversationDepth: vi.fn(),
}));

vi.mock('@/actions/goals', () => ({
  getGoal: vi.fn(),
}));

describe('Chat Helpers with Mastra Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeChatWithMastra', () => {
    it('should initialize chat session with goal data and generate first question', async () => {
      // Arrange
      const { getGoal } = await import('@/actions/goals');
      const { createChatSession } = await import('@/actions/chat');
      const { generateNextQuestion } = await import('@/actions/ai-conversation');

      vi.mocked(getGoal).mockResolvedValue({
        success: true,
        data: { id: 'goal-1', title: '5年後に1億円稼ぐ', userId: 'user-1' }
      });

      vi.mocked(createChatSession).mockResolvedValue({
        success: true,
        data: { id: 'session-1', goalId: 'goal-1', userId: 'user-1' }
      });

      vi.mocked(generateNextQuestion).mockResolvedValue({
        success: true,
        data: { question: 'あなたがその夢を目指す、一番の「動機」は何ですか？', type: 'question', depth: 1 }
      });

      const goalId = 'goal-1';
      const userId = 'user-1';
      const expectedResult = {
        sessionId: 'session-1',
        welcomeMessage: expect.stringContaining('夢の実現'),
        firstQuestion: expect.stringContaining('動機'),
      };

      // Act & Assert
      await expect(
        initializeChatWithMastra(goalId, userId)
      ).resolves.toEqual(expectedResult);
    });

    it('should handle goal not found error', async () => {
      // Arrange
      const { getGoal } = await import('@/actions/goals');
      
      vi.mocked(getGoal).mockResolvedValue({
        success: false,
        error: 'Goal not found'
      });

      const invalidGoalId = 'invalid-goal';
      const userId = 'user-1';

      // Act & Assert
      await expect(
        initializeChatWithMastra(invalidGoalId, userId)
      ).rejects.toThrow('Goal not found');
    });
  });

  describe('handleUserMessage', () => {
    it('should process user message and generate AI response using Mastra', async () => {
      // Arrange
      const { addChatMessage } = await import('@/actions/chat');
      const { generateNextQuestion, analyzeConversationDepth } = await import('@/actions/ai-conversation');

      vi.mocked(addChatMessage).mockResolvedValue({
        success: true,
        data: { id: 'msg-1', content: 'message saved' }
      });

      vi.mocked(generateNextQuestion).mockResolvedValue({
        success: true,
        data: { question: 'なるほど、素晴らしい動機ですね', type: 'question', depth: 1 }
      });

      vi.mocked(analyzeConversationDepth).mockResolvedValue({
        success: true,
        data: { 
          isReadyToProceed: false,
          currentDepth: 2,
          maxDepth: 5,
          completionPercentage: 40
        }
      });

      const sessionId = 'session-1';
      const goalId = 'goal-1';
      const userId = 'user-1';
      const userMessage = '自由な時間が欲しいです';
      const chatHistory = [];

      const expectedResult = {
        aiResponse: expect.stringContaining('なるほど'),
        conversationDepth: 2,
        isComplete: false,
        informationSufficiency: expect.any(Number),
        conversationQuality: expect.any(String),
        suggestedNextAction: expect.any(String),
        reasoning: expect.any(String),
      };

      // Act & Assert
      await expect(
        handleUserMessage(sessionId, goalId, userId, userMessage, chatHistory)
      ).resolves.toEqual(expectedResult);
    });

    it('should save both user and AI messages to database', async () => {
      // Arrange
      const { addChatMessage } = await import('@/actions/chat');
      const { generateNextQuestion, analyzeConversationDepth } = await import('@/actions/ai-conversation');

      vi.mocked(addChatMessage).mockResolvedValue({
        success: true,
        data: { id: 'msg-1', content: 'message saved' }
      });

      vi.mocked(generateNextQuestion).mockResolvedValue({
        success: true,
        data: { question: 'AIからの質問', type: 'question', depth: 1 }
      });

      vi.mocked(analyzeConversationDepth).mockResolvedValue({
        success: true,
        data: { 
          isReadyToProceed: false,
          currentDepth: 2,
          maxDepth: 5,
          completionPercentage: 40
        }
      });

      const sessionId = 'session-1';
      const goalId = 'goal-1';
      const userId = 'user-1';
      const userMessage = 'テストメッセージ';
      const chatHistory = [];

      // Act & Assert
      await expect(
        handleUserMessage(sessionId, goalId, userId, userMessage, chatHistory)
      ).resolves.toBeDefined();
    });
  });

  describe('isConversationComplete', () => {
    it('should analyze conversation depth and determine completion', async () => {
      // Arrange
      const chatHistory = [
        { role: 'user', content: '自由な時間が欲しい' },
        { role: 'ai', content: 'なるほど' },
        { role: 'user', content: 'プログラミングが得意です' },
        { role: 'ai', content: '素晴らしいスキルですね' },
        { role: 'user', content: '副業から始めたい' },
      ];
      const goal = {
        id: 'goal-1',
        title: '1億円稼ぐ',
        userId: 'user-1',
      };

      // Act & Assert
      await expect(
        isConversationComplete(chatHistory, goal)
      ).resolves.toEqual({
        isComplete: false,
        currentDepth: 2, // 5 messages / 2 = 2 (rounded down)
        maxDepth: 5,
        completionPercentage: 40, // (2 / 5) * 100 = 40
      });
    });

    it('should return true when conversation has sufficient depth', async () => {
      // 十分な深さの対話履歴
      const deepChatHistory = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'ai',
        content: `Message ${i + 1}`,
      }));

      const goal = {
        id: 'goal-1',
        title: '1億円稼ぐ',
        userId: 'user-1',
      };

      await expect(
        isConversationComplete(deepChatHistory, goal)
      ).resolves.toEqual(
        expect.objectContaining({
          isComplete: true,
        })
      );
    });
  });
});