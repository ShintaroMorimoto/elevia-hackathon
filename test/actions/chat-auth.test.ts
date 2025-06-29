import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createChatSession,
  addChatMessage,
  getChatMessages,
  updateChatSession,
} from '@/actions/chat';
import { requireAuthentication, AuthenticationError } from '@/lib/auth';
import type { NewChatSession, NewChatMessage } from '@/lib/db/schema';

// Mock the database connection
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue([]),
          limit: vi.fn().mockReturnValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue([]),
        }),
      }),
    }),
  },
}));

// Mock auth utility
vi.mock('@/lib/auth', () => ({
  requireAuthentication: vi.fn(),
  AuthenticationError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
}));

describe('Chat Server Actions - Authentication', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createChatSession', () => {
    const validSessionData: NewChatSession = {
      goalId: 'goal-123',
      status: 'active',
    };

    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(createChatSession(validSessionData)).rejects.toThrow(
        AuthenticationError,
      );
      expect(requireAuthentication).toHaveBeenCalledOnce();
    });

    it('should allow chat session creation for authenticated user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const { db } = await import('@/lib/db');
      const mockInsert = db.insert as ReturnType<typeof vi.fn>;
      const mockValues = mockInsert().values as ReturnType<typeof vi.fn>;
      const mockReturning = mockValues().returning as ReturnType<typeof vi.fn>;

      mockReturning.mockResolvedValueOnce([validSessionData]);

      const result = await createChatSession(validSessionData);

      expect(requireAuthentication).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        data: validSessionData,
      });
    });
  });

  describe('addChatMessage', () => {
    const validMessageData: NewChatMessage = {
      sessionId: 'session-123',
      content: 'Test message',
      senderType: 'user',
      messageOrder: 1,
    };

    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(addChatMessage(validMessageData)).rejects.toThrow(
        AuthenticationError,
      );
      expect(requireAuthentication).toHaveBeenCalledOnce();
    });

    it('should allow chat message creation for authenticated user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const { db } = await import('@/lib/db');
      const mockInsert = db.insert as ReturnType<typeof vi.fn>;
      const mockValues = mockInsert().values as ReturnType<typeof vi.fn>;
      const mockReturning = mockValues().returning as ReturnType<typeof vi.fn>;

      mockReturning.mockResolvedValueOnce([validMessageData]);

      const result = await addChatMessage(validMessageData);

      expect(requireAuthentication).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        data: validMessageData,
      });
    });
  });

  describe('getChatMessages', () => {
    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(getChatMessages('session-123')).rejects.toThrow(
        AuthenticationError,
      );
      expect(requireAuthentication).toHaveBeenCalledOnce();
    });

    it('should allow getting chat messages for authenticated user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const { db } = await import('@/lib/db');
      const mockSelect = db.select as ReturnType<typeof vi.fn>;
      const mockFrom = mockSelect().from as ReturnType<typeof vi.fn>;
      const mockWhere = mockFrom().where as ReturnType<typeof vi.fn>;
      const mockOrderBy = mockWhere().orderBy as ReturnType<typeof vi.fn>;

      mockOrderBy.mockResolvedValueOnce([]);

      const result = await getChatMessages('session-123');

      expect(requireAuthentication).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        data: [],
      });
    });
  });

  describe('updateChatSession', () => {
    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(
        updateChatSession('session-123', { status: 'completed' }),
      ).rejects.toThrow(AuthenticationError);
      expect(requireAuthentication).toHaveBeenCalledOnce();
    });

    it('should allow updating chat session for authenticated user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const { db } = await import('@/lib/db');

      // Mock for the existence check
      const mockSelect = db.select as ReturnType<typeof vi.fn>;
      const mockFrom = mockSelect().from as ReturnType<typeof vi.fn>;
      const mockWhere = mockFrom().where as ReturnType<typeof vi.fn>;
      const mockLimit = mockWhere().limit as ReturnType<typeof vi.fn>;

      mockLimit.mockResolvedValueOnce([
        { id: 'session-123', goalId: 'goal-123' },
      ]);

      // Mock for the update
      const mockUpdate = db.update as ReturnType<typeof vi.fn>;
      const mockSet = mockUpdate().set as ReturnType<typeof vi.fn>;
      const mockWhereUpdate = mockSet().where as ReturnType<typeof vi.fn>;
      const mockReturning = mockWhereUpdate().returning as ReturnType<
        typeof vi.fn
      >;

      mockReturning.mockResolvedValueOnce([
        { id: 'session-123', status: 'completed' },
      ]);

      const result = await updateChatSession('session-123', {
        status: 'completed',
      });

      expect(requireAuthentication).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        data: { id: 'session-123', status: 'completed' },
      });
    });
  });
});
