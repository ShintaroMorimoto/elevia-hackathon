import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createYearlyOkr,
  createQuarterlyOkr,
  createKeyResult,
} from '@/actions/okr';
import { requireAuthentication, AuthenticationError } from '@/lib/auth';
import type {
  NewYearlyOkr,
  NewQuarterlyOkr,
  NewKeyResult,
} from '@/lib/db/schema';

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

describe('OKR Server Actions - Authentication', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createYearlyOkr', () => {
    const validOkrData: NewYearlyOkr = {
      goalId: 'goal-123',
      objective: 'Test Yearly Objective',
      targetYear: 2025,
      sortOrder: 0,
    };

    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(createYearlyOkr(validOkrData)).rejects.toThrow(
        AuthenticationError,
      );
      expect(requireAuthentication).toHaveBeenCalledOnce();
    });

    it('should allow yearly OKR creation for authenticated user', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockUser,
      );

      const { db } = await import('@/lib/db');
      const mockInsert = db.insert as ReturnType<typeof vi.fn>;
      const mockValues = mockInsert().values as ReturnType<typeof vi.fn>;
      const mockReturning = mockValues().returning as ReturnType<typeof vi.fn>;

      mockReturning.mockResolvedValueOnce([validOkrData]);

      const result = await createYearlyOkr(validOkrData);

      expect(requireAuthentication).toHaveBeenCalledOnce();
      expect(result).toEqual({
        success: true,
        data: validOkrData,
      });
    });
  });

  describe('createQuarterlyOkr', () => {
    const validOkrData: NewQuarterlyOkr = {
      yearlyOkrId: 'yearly-okr-123',
      objective: 'Test Quarterly Objective',
      targetYear: 2025,
      targetQuarter: 1,
      sortOrder: 0,
    };

    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(createQuarterlyOkr(validOkrData)).rejects.toThrow(
        AuthenticationError,
      );
      expect(requireAuthentication).toHaveBeenCalledOnce();
    });
  });

  describe('createKeyResult', () => {
    const validKrData: NewKeyResult = {
      yearlyOkrId: 'yearly-okr-123',
      description: 'Test Key Result',
      targetValue: '100',
      currentValue: '0',
      unit: 'units',
      sortOrder: 0,
    };

    it('should throw AuthenticationError when user is not authenticated', async () => {
      (requireAuthentication as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new AuthenticationError('Authentication required'),
      );

      await expect(createKeyResult(validKrData)).rejects.toThrow(
        AuthenticationError,
      );
      expect(requireAuthentication).toHaveBeenCalledOnce();
    });
  });
});
