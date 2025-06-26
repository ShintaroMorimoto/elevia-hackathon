import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializePlanGeneration, generatePlanWithMastra } from '@/app/utils/plan-generation-helpers';

// Mock Server Actions for isolated testing
vi.mock('@/actions/ai-planning', () => ({
  generateOKRPlan: vi.fn(),
}));

vi.mock('@/actions/okr', () => ({
  createYearlyOKR: vi.fn(),
  createQuarterlyOKR: vi.fn(),
  createKeyResult: vi.fn(),
}));

vi.mock('@/actions/goals', () => ({
  getGoal: vi.fn(),
}));

vi.mock('@/actions/chat', () => ({
  getChatMessages: vi.fn(),
}));

describe('Plan Generation Helpers with Mastra Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializePlanGeneration', () => {
    it('should initialize plan generation with goal and chat history', async () => {
      // Arrange
      const { getGoal } = await import('@/actions/goals');
      const { getChatMessages } = await import('@/actions/chat');

      vi.mocked(getGoal).mockResolvedValue({
        success: true,
        data: { id: 'goal-1', title: '5年後に1億円稼ぐ', userId: 'user-1', deadline: '2029-12-31' }
      });

      vi.mocked(getChatMessages).mockResolvedValue({
        success: true,
        data: [
          { content: '自由な時間が欲しい', senderType: 'user' },
          { content: 'プログラミングが得意', senderType: 'user' },
        ]
      });

      const goalId = 'goal-1';
      const userId = 'user-1';
      const sessionId = 'session-1';
      
      const expectedResult = {
        goalData: expect.objectContaining({
          title: '5年後に1億円稼ぐ',
          deadline: '2029-12-31'
        }),
        chatHistory: expect.arrayContaining([
          expect.objectContaining({ content: '自由な時間が欲しい' })
        ]),
        isReady: true,
      };

      // Act & Assert
      await expect(
        initializePlanGeneration(goalId, userId, sessionId)
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
      const sessionId = 'session-1';

      // Act & Assert
      await expect(
        initializePlanGeneration(invalidGoalId, userId, sessionId)
      ).rejects.toThrow('Goal not found');
    });
  });

  describe('generatePlanWithMastra', () => {
    it('should generate OKR plan using Mastra and save to database', async () => {
      // Arrange
      const { generateOKRPlan } = await import('@/actions/ai-planning');
      const { createYearlyOKR, createQuarterlyOKR, createKeyResult } = await import('@/actions/okr');

      const mockGeneratedPlan = {
        success: true,
        data: {
          yearlyOKRs: [
            {
              year: 2025,
              objective: '基盤構築の年',
              keyResults: ['売上10万円達成', 'スキル習得完了'],
              quarterlyOKRs: [
                {
                  quarter: 1,
                  objective: 'ビジネス開始',
                  keyResults: ['副業開始', '初回売上']
                }
              ]
            }
          ]
        }
      };

      vi.mocked(generateOKRPlan).mockResolvedValue(mockGeneratedPlan);
      vi.mocked(createYearlyOKR).mockResolvedValue({
        success: true,
        data: { id: 'yearly-1' }
      });
      vi.mocked(createQuarterlyOKR).mockResolvedValue({
        success: true,
        data: { id: 'quarterly-1' }
      });
      vi.mocked(createKeyResult).mockResolvedValue({
        success: true,
        data: { id: 'kr-1' }
      });

      const goalId = 'goal-1';
      const userId = 'user-1';
      const goalData = { title: '5年後に1億円稼ぐ', deadline: '2029-12-31' };
      const chatHistory = [{ content: '自由な時間が欲しい', senderType: 'user' }];

      const expectedResult = {
        success: true,
        planId: expect.any(String),
        yearlyOKRs: expect.arrayContaining([
          expect.objectContaining({
            year: 2025,
            objective: '基盤構築の年'
          })
        ])
      };

      // Act & Assert
      await expect(
        generatePlanWithMastra(goalId, userId, goalData, chatHistory)
      ).resolves.toEqual(expectedResult);
    });

    it('should handle Mastra generation failure', async () => {
      // Arrange
      const { generateOKRPlan } = await import('@/actions/ai-planning');
      
      vi.mocked(generateOKRPlan).mockResolvedValue({
        success: false,
        error: 'AI generation failed'
      });

      const goalId = 'goal-1';
      const userId = 'user-1';
      const goalData = { title: '5年後に1億円稼ぐ', deadline: '2029-12-31' };
      const chatHistory = [];

      // Act & Assert
      await expect(
        generatePlanWithMastra(goalId, userId, goalData, chatHistory)
      ).rejects.toThrow('AI generation failed');
    });
  });
});