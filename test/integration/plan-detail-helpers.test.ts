import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadPlanData, updateOKRProgress, toggleOKRCompletion } from '@/app/utils/plan-detail-helpers';

// Mock Server Actions for isolated testing
vi.mock('@/actions/goals', () => ({
  getGoal: vi.fn(),
}));

vi.mock('@/actions/okr', () => ({
  getYearlyOKRs: vi.fn(),
  getQuarterlyOKRs: vi.fn(),
  getKeyResults: vi.fn(),
  updateYearlyOkr: vi.fn(),
  updateQuarterlyOkr: vi.fn(),
  updateKeyResult: vi.fn(),
}));

describe('Plan Detail Helpers with Database Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadPlanData', () => {
    it('should load goal data with yearly and quarterly OKRs from database', async () => {
      // Arrange
      const { getGoal } = await import('@/actions/goals');
      const { getYearlyOKRs, getQuarterlyOKRs, getKeyResults } = await import('@/actions/okr');

      vi.mocked(getGoal).mockResolvedValue({
        success: true,
        data: { 
          id: 'goal-1', 
          title: '5年後に1億円稼ぐ', 
          dueDate: '2029-12-31',
          userId: 'user-1'
        }
      });

      vi.mocked(getYearlyOKRs).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'yearly-1',
            targetYear: 2025,
            objective: '基盤構築の年',
            progressPercentage: '0'
          }
        ]
      });

      vi.mocked(getQuarterlyOKRs).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'quarterly-1',
            yearlyOkrId: 'yearly-1',
            targetQuarter: 1,
            objective: 'ビジネス開始',
            progressPercentage: '0'
          }
        ]
      });

      vi.mocked(getKeyResults).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'kr-1',
            yearlyOkrId: 'yearly-1',
            quarterlyOkrId: null,
            description: '売上10万円達成',
            targetValue: '100000',
            currentValue: '0'
          }
        ]
      });

      const goalId = 'goal-1';
      const userId = 'user-1';
      
      const expectedResult = {
        goal: expect.objectContaining({
          title: '5年後に1億円稼ぐ',
          deadline: '2029-12-31'
        }),
        yearlyOKRs: expect.arrayContaining([
          expect.objectContaining({
            year: 2025,
            objective: '基盤構築の年',
            quarterlyOKRs: expect.arrayContaining([
              expect.objectContaining({
                quarter: 1,
                objective: 'ビジネス開始'
              })
            ]),
            keyResults: expect.arrayContaining([
              expect.objectContaining({
                result: '売上10万円達成',
                targetValue: 100000,
                currentValue: 0
              })
            ])
          })
        ]),
        totalProgress: expect.any(Number)
      };

      // Act & Assert
      await expect(
        loadPlanData(goalId, userId)
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
        loadPlanData(invalidGoalId, userId)
      ).rejects.toThrow('Failed to load plan data for goal invalid-goal: Goal not found');
    });
  });

  describe('updateOKRProgress', () => {
    it('should update key result progress in database', async () => {
      // Arrange
      const { updateKeyResult } = await import('@/actions/okr');

      vi.mocked(updateKeyResult).mockResolvedValue({
        success: true,
        data: { id: 'kr-1', currentValue: 50000 }
      });

      const keyResultId = 'kr-1';
      const newCurrentValue = 50000;
      const targetValue = 100000;

      const expectedResult = {
        success: true,
        progress: 50, // (50000 / 100000) * 100
        data: expect.objectContaining({
          currentValue: 50000
        })
      };

      // Act & Assert
      await expect(
        updateOKRProgress(keyResultId, newCurrentValue, targetValue)
      ).resolves.toEqual(expectedResult);
    });

    it('should handle database update errors', async () => {
      // Arrange
      const { updateKeyResult } = await import('@/actions/okr');
      
      vi.mocked(updateKeyResult).mockResolvedValue({
        success: false,
        error: 'Database update failed'
      });

      const keyResultId = 'kr-1';
      const newCurrentValue = 50000;
      const targetValue = 100000;

      // Act & Assert
      await expect(
        updateOKRProgress(keyResultId, newCurrentValue, targetValue)
      ).rejects.toThrow('Database update failed');
    });
  });

  describe('toggleOKRCompletion', () => {
    it('should toggle yearly OKR completion status', async () => {
      // Arrange
      const { updateYearlyOkr } = await import('@/actions/okr');

      vi.mocked(updateYearlyOkr).mockResolvedValue({
        success: true,
        data: { id: 'yearly-1', progressPercentage: '100.00' }
      });

      const okrId = 'yearly-1';
      const currentStatus = false;
      const okrType = 'yearly';

      const expectedResult = {
        success: true,
        newStatus: true,
        data: expect.objectContaining({
          progressPercentage: "100.00"
        })
      };

      // Act & Assert
      await expect(
        toggleOKRCompletion(okrId, currentStatus, okrType)
      ).resolves.toEqual(expectedResult);
    });

    it('should toggle quarterly OKR completion status', async () => {
      // Arrange
      const { updateQuarterlyOkr } = await import('@/actions/okr');

      vi.mocked(updateQuarterlyOkr).mockResolvedValue({
        success: true,
        data: { id: 'quarterly-1', progressPercentage: '100.00' }
      });

      const okrId = 'quarterly-1';
      const currentStatus = false;
      const okrType = 'quarterly';

      const expectedResult = {
        success: true,
        newStatus: true,
        data: expect.objectContaining({
          progressPercentage: "100.00"
        })
      };

      // Act & Assert
      await expect(
        toggleOKRCompletion(okrId, currentStatus, okrType)
      ).resolves.toEqual(expectedResult);
    });

    it('should handle invalid OKR type', async () => {
      const okrId = 'okr-1';
      const currentStatus = false;
      const okrType = 'invalid' as any;

      // Act & Assert
      await expect(
        toggleOKRCompletion(okrId, currentStatus, okrType)
      ).rejects.toThrow('Invalid OKR type');
    });
  });
});