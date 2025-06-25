import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NewChatSession, ChatSession, NewChatMessage, ChatMessage } from '../../lib/db/schema';

// Mock the database with proper chain methods
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockReturning = vi.fn();
const mockValues = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockSet = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock('../../lib/db', () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  },
}));

// Chain mocks - setup default returns
mockInsert.mockReturnValue({ values: mockValues });
mockValues.mockReturnValue({ returning: mockReturning });
mockSelect.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
mockOrderBy.mockReturnValue(Promise.resolve([]));
mockLimit.mockReturnValue(Promise.resolve([]));
mockUpdate.mockReturnValue({ set: mockSet });
mockSet.mockReturnValue({ where: mockWhere });
mockReturning.mockReturnValue(Promise.resolve([]));

// Dynamic import to ensure mock is loaded
const { createChatSession, addChatMessage, getChatMessages, updateChatSession } = await import('../../actions/chat');

describe('Chat Server Actions', () => {
  const mockGoalId = 'goal-123';
  const mockSessionId = 'session-123';
  const mockMessageId = 'message-123';

  const mockNewChatSession: NewChatSession = {
    goalId: mockGoalId,
    status: 'active',
  };

  const mockChatSession: ChatSession = {
    id: mockSessionId,
    goalId: mockGoalId,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNewChatMessage: NewChatMessage = {
    sessionId: mockSessionId,
    senderType: 'user',
    content: 'Test message',
    messageOrder: 1,
  };

  const mockChatMessage: ChatMessage = {
    id: mockMessageId,
    sessionId: mockSessionId,
    senderType: 'user',
    content: 'Test message',
    messageOrder: 1,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain mocks
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
    mockOrderBy.mockReturnValue(Promise.resolve([]));
    mockLimit.mockReturnValue(Promise.resolve([]));
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockReturning.mockReturnValue(Promise.resolve([]));
  });

  describe('createChatSession', () => {
    it('should create a new chat session successfully', async () => {
      // Mock successful session creation
      mockReturning.mockResolvedValueOnce([mockChatSession]);
      
      const result = await createChatSession(mockNewChatSession);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          goalId: mockGoalId,
          status: 'active',
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockReturning.mockRejectedValueOnce(new Error('Database error'));
      
      const result = await createChatSession(mockNewChatSession);
      
      expect(result).toEqual({
        success: false,
        error: expect.any(String),
      });
    });

    it('should validate required fields', async () => {
      const invalidSession = { ...mockNewChatSession, goalId: '' };
      const result = await createChatSession(invalidSession);
      
      expect(result).toEqual({
        success: false,
        error: 'Goal ID is required',
      });
    });
  });

  describe('addChatMessage', () => {
    it('should add a chat message successfully', async () => {
      // Mock successful message creation
      mockReturning.mockResolvedValueOnce([mockChatMessage]);
      
      const result = await addChatMessage(mockNewChatMessage);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          sessionId: mockSessionId,
          senderType: 'user',
          content: 'Test message',
          messageOrder: 1,
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      const result = await addChatMessage(mockNewChatMessage);
      
      expect(result).toEqual({
        success: false,
        error: expect.any(String),
      });
    });

    it('should validate required fields', async () => {
      const invalidMessage = { ...mockNewChatMessage, content: '' };
      const result = await addChatMessage(invalidMessage);
      
      expect(result).toEqual({
        success: false,
        error: 'Message content is required',
      });
    });

    it('should validate sender type', async () => {
      const invalidMessage = { ...mockNewChatMessage, senderType: 'invalid' as any };
      const result = await addChatMessage(invalidMessage);
      
      expect(result).toEqual({
        success: false,
        error: 'Sender type must be user or ai',
      });
    });
  });

  describe('getChatMessages', () => {
    it('should return messages for a specific session', async () => {
      // Mock successful message retrieval
      mockOrderBy.mockResolvedValueOnce([mockChatMessage]);
      
      const result = await getChatMessages(mockSessionId);
      
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            sessionId: mockSessionId,
          }),
        ]),
      });
    });

    it('should return empty array when session has no messages', async () => {
      // Mock empty message retrieval
      mockOrderBy.mockResolvedValueOnce([]);
      
      const result = await getChatMessages('session-with-no-messages');
      
      expect(result).toEqual({
        success: true,
        data: [],
      });
    });

    it('should handle database errors', async () => {
      // Mock database error
      mockOrderBy.mockRejectedValueOnce(new Error('Database error'));
      
      const result = await getChatMessages('invalid-session');
      
      expect(result).toEqual({
        success: false,
        error: expect.any(String),
      });
    });

    it('should validate session ID', async () => {
      const result = await getChatMessages('');
      
      expect(result).toEqual({
        success: false,
        error: 'Session ID is required',
      });
    });
  });

  describe('updateChatSession', () => {
    it('should update a chat session successfully', async () => {
      // Mock existing session check
      mockLimit.mockResolvedValueOnce([mockChatSession]);
      // Mock successful update
      const updatedSession = { ...mockChatSession, status: 'completed' };
      mockReturning.mockResolvedValueOnce([updatedSession]);
      
      const updateData = { status: 'completed' as const };
      const result = await updateChatSession(mockSessionId, updateData);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockSessionId,
          status: 'completed',
        }),
      });
    });

    it('should return not found for non-existent session', async () => {
      // Mock empty session check
      mockLimit.mockResolvedValueOnce([]);
      
      const result = await updateChatSession('non-existent-session', { status: 'completed' });
      
      expect(result).toEqual({
        success: false,
        error: 'Chat session not found',
      });
    });

    it('should handle database errors', async () => {
      // Mock database error
      mockLimit.mockRejectedValueOnce(new Error('Database error'));
      
      const result = await updateChatSession('invalid-session', { status: 'completed' });
      
      expect(result).toEqual({
        success: false,
        error: expect.any(String),
      });
    });

    it('should validate session ID', async () => {
      const result = await updateChatSession('', { status: 'completed' });
      
      expect(result).toEqual({
        success: false,
        error: 'Session ID is required',
      });
    });
  });
});