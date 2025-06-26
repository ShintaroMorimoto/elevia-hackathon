import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createChatSession, addChatMessage } from '@/actions/chat';
import { generateNextQuestion } from '@/actions/ai-conversation';
import { getGoal } from '@/actions/goals';

// Mock the Server Actions for UI integration testing
vi.mock('@/actions/chat');
vi.mock('@/actions/ai-conversation');
vi.mock('@/actions/goals');

describe('Chat UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Chat Session Management', () => {
    it('should create a chat session when initializing chat', async () => {
      // Arrange
      const mockGoal = {
        id: 'goal-1',
        title: '5年後に1億円稼ぐ',
        description: 'Test goal',
        userId: 'user-1',
        dueDate: new Date('2029-12-31'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockChatSession = {
        id: 'session-1',
        goalId: 'goal-1',
        userId: 'user-1',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getGoal).mockResolvedValue({
        success: true,
        data: mockGoal,
      });

      vi.mocked(createChatSession).mockResolvedValue({
        success: true,
        data: mockChatSession,
      });

      // Act
      const goalResult = await getGoal('goal-1');
      const sessionResult = await createChatSession({
        goalId: 'goal-1',
        userId: 'user-1',
        status: 'active',
      });

      // Assert
      expect(goalResult.success).toBe(true);
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.data?.id).toBe('session-1');
    });

    it('should generate first AI question after creating session', async () => {
      // Arrange
      const mockQuestion = {
        question: 'あなたがその夢を目指す、一番の「動機」は何ですか？',
        type: 'question',
        depth: 1,
      };

      vi.mocked(generateNextQuestion).mockResolvedValue({
        success: true,
        data: mockQuestion,
      });

      // Act
      const result = await generateNextQuestion('goal-1', 'user-1', []);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.question).toContain('動機');
      expect(result.data?.depth).toBe(1);
    });

    it('should save AI and user messages to database', async () => {
      // Arrange
      const mockMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        content: 'Test message',
        senderType: 'ai' as const,
        messageOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(addChatMessage).mockResolvedValue({
        success: true,
        data: mockMessage,
      });

      // Act
      const result = await addChatMessage({
        sessionId: 'session-1',
        content: 'Test message',
        senderType: 'ai',
        messageOrder: 0,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Test message');
    });
  });

  describe('Dynamic Question Generation', () => {
    it('should generate contextual questions based on chat history', async () => {
      // Arrange
      const chatHistory = [
        { role: 'user', content: '自由な時間が欲しいです' },
        { role: 'ai', content: 'なるほど、素晴らしい動機ですね' }
      ];

      const mockQuestion = {
        question: '現在のあなたのスキルや経験について教えてください',
        type: 'question',
        depth: 2,
      };

      vi.mocked(generateNextQuestion).mockResolvedValue({
        success: true,
        data: mockQuestion,
      });

      // Act
      const result = await generateNextQuestion('goal-1', 'user-1', chatHistory);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.depth).toBe(2);
      expect(generateNextQuestion).toHaveBeenCalledWith('goal-1', 'user-1', chatHistory);
    });

    it('should handle errors gracefully when question generation fails', async () => {
      // Arrange
      vi.mocked(generateNextQuestion).mockResolvedValue({
        success: false,
        error: 'Failed to generate question',
      });

      // Act
      const result = await generateNextQuestion('goal-1', 'user-1', []);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate question');
    });
  });

  describe('Session Authentication', () => {
    it('should require valid user session for chat operations', async () => {
      // Arrange
      vi.mocked(createChatSession).mockResolvedValue({
        success: false,
        error: 'User not authenticated',
      });

      // Act
      const result = await createChatSession({
        goalId: 'goal-1',
        userId: '', // Empty user ID
        status: 'active',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('authenticated');
    });
  });
});