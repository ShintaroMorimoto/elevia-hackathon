import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  deleteGoal,
} from '@/actions/goals';
import { requireAuthentication, AuthenticationError } from '@/lib/auth';
import type { NewGoal } from '@/lib/db/schema';

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
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
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

// Mock plan detail helpers
vi.mock('@/app/utils/plan-detail-helpers', () => ({
  calculateGoalProgress: vi.fn().mockResolvedValue(50),
}));

describe('Goals Server Actions - Authentication', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGoal', () => {
    const validGoalData: NewGoal = {
      title: 'Test Goal',
      description: 'Test Description',
      userId: 'user-123',
      dueDate: new Date(Date.now() + 6 * 365 * 24 * 60 * 60 * 1000), // 6 years from now to meet minimum requirement
      status: 'active',
    };

    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(createGoal(validGoalData)).rejects.toThrow(
        AuthenticationError,
      );
      expect(requireAuthentication).toHaveBeenCalledOnce();
    });

    it('should reject goal creation for different user when authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const differentUserGoal = { ...validGoalData, userId: 'different-user' };

      const result = await createGoal(differentUserGoal);

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized: Cannot create goal for different user',
      });
    });

    it('should allow goal creation for authenticated user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const { db } = await import('@/lib/db');
      const mockInsert = db.insert as ReturnType<typeof vi.fn>;
      const mockValues = mockInsert().values as ReturnType<typeof vi.fn>;
      const mockReturning = mockValues().returning as ReturnType<typeof vi.fn>;

      mockReturning.mockResolvedValueOnce([validGoalData]);

      const result = await createGoal(validGoalData);

      expect(requireAuthentication).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        data: validGoalData,
      });
    });
  });

  describe('getGoals', () => {
    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(getGoals('user-123')).rejects.toThrow(AuthenticationError);
    });

    it('should reject getting goals for different user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const result = await getGoals('different-user');

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized: Cannot access goals for different user',
      });
    });

    it('should allow getting goals for authenticated user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const { db } = await import('@/lib/db');
      const mockSelect = db.select as ReturnType<typeof vi.fn>;
      const mockFrom = mockSelect().from as ReturnType<typeof vi.fn>;
      const mockWhere = mockFrom().where as ReturnType<typeof vi.fn>;
      const mockOrderBy = mockWhere().orderBy as ReturnType<typeof vi.fn>;

      mockOrderBy.mockResolvedValueOnce([]);

      const result = await getGoals('user-123');

      expect(requireAuthentication).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        data: [],
      });
    });
  });

  describe('getGoal', () => {
    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(getGoal('goal-123', 'user-123')).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should reject getting goal for different user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const result = await getGoal('goal-123', 'different-user');

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized: Cannot access goal for different user',
      });
    });
  });

  describe('updateGoal', () => {
    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(
        updateGoal('goal-123', 'user-123', { title: 'Updated' }),
      ).rejects.toThrow(AuthenticationError);
    });

    it('should reject updating goal for different user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const result = await updateGoal('goal-123', 'different-user', {
        title: 'Updated',
      });

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized: Cannot update goal for different user',
      });
    });
  });

  describe('deleteGoal', () => {
    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(deleteGoal('goal-123', 'user-123')).rejects.toThrow(
        AuthenticationError,
      );
    });

    it('should reject deleting goal for different user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const result = await deleteGoal('goal-123', 'different-user');

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized: Cannot delete goal for different user',
      });
    });
  });
});
