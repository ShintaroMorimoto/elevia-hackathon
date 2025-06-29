import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Goal } from '../../lib/db/schema';

// Mock Mastra
const mockAgent = {
  generate: vi.fn(),
};

vi.mock('@mastra/core', () => ({
  Agent: vi.fn().mockImplementation(() => mockAgent),
}));

// Mock RuntimeContext
vi.mock('@mastra/core/di', () => ({
  RuntimeContext: vi.fn().mockImplementation(() => ({})),
}));

// Mock Mastra tools
const mockGenerateOKRTool = {
  execute: vi.fn(),
};
const mockAnalyzeChatHistoryTool = {
  execute: vi.fn(),
};
const mockGoalAnalysisTool = {
  execute: vi.fn(),
};

vi.mock('../../src/mastra/tools/okr-tools', () => ({
  generateOKRTool: mockGenerateOKRTool,
  analyzeChatHistoryTool: mockAnalyzeChatHistoryTool,
}));

vi.mock('../../src/mastra/tools/goal-tools', () => ({
  goalAnalysisTool: mockGoalAnalysisTool,
}));

// Mock OKR actions
const mockCreateYearlyOkr = vi.fn();
const mockCreateQuarterlyOkr = vi.fn();
const mockCreateKeyResult = vi.fn();

vi.mock('../../actions/okr', () => ({
  createYearlyOkr: mockCreateYearlyOkr,
  createQuarterlyOkr: mockCreateQuarterlyOkr,
  createKeyResult: mockCreateKeyResult,
}));

// Mock database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

vi.mock('../../lib/db', () => ({
  db: {
    select: mockSelect,
  },
}));

mockSelect.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({ where: mockWhere });
mockWhere.mockReturnValue({ 
  limit: mockLimit,
  then: function(resolve) { 
    // This makes mockWhere awaitable (for calls without .limit())
    return Promise.resolve([]).then(resolve); 
  }
});
mockLimit.mockReturnValue(Promise.resolve([]));

// Dynamic import to ensure mocks are loaded
const { generateOKRPlan } = await import('../../actions/ai-planning');

describe('AI Planning Server Actions', () => {
  const mockGoal: Goal = {
    id: 'goal-123',
    userId: 'user-123',
    title: '世界一周旅行をする',
    description: '30歳までに世界一周旅行を実現したい',
    dueDate: '2027-12-31',
    status: 'active',
    progressPercentage: '0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChatHistory = [
    { role: 'user', content: 'なぜこの目標を達成したいですか？' },
    { role: 'assistant', content: '世界の文化を体験し、視野を広げたいから' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the default mock behavior
    mockWhere.mockReturnValue({ 
      limit: mockLimit,
      then: function(resolve) { 
        // This makes mockWhere awaitable (for calls without .limit())
        return Promise.resolve([]).then(resolve); 
      }
    });
    mockLimit.mockReturnValue(Promise.resolve([]));

    // Set up default mock behaviors for Mastra tools
    mockAnalyzeChatHistoryTool.execute.mockResolvedValue({
      userMotivation: 'Test motivation',
      keyInsights: ['Test insight'],
      readinessLevel: 8,
      recommendedActions: ['Test action'],
    });

    mockGoalAnalysisTool.execute.mockResolvedValue({
      completionPercentage: 0,
    });

    mockGenerateOKRTool.execute.mockResolvedValue({
      yearly: [],
      quarterly: [],
    });

    // Set up default mock behaviors for OKR actions
    mockCreateYearlyOkr.mockResolvedValue({ success: true, data: { id: 'yearly-1' } });
    mockCreateQuarterlyOkr.mockResolvedValue({ success: true, data: { id: 'quarterly-1' } });
    mockCreateKeyResult.mockResolvedValue({ success: true, data: { id: 'kr-1' } });
  });

  describe('generateOKRPlan', () => {
    it('should generate OKR plan successfully', async () => {
      // Mock goal exists (first call with limit)
      mockLimit.mockResolvedValueOnce([mockGoal]);
      // Mock existing OKRs (second call without limit) - should return empty array
      mockWhere.mockReturnValueOnce({ 
        limit: mockLimit,
        then: function(resolve) { 
          return Promise.resolve([]).then(resolve); 
        }
      });
      
      // Mock OKR generation response
      const mockOKRPlan = {
        yearly: [
          {
            year: 2025,
            objective: 'トラベルスキルと資金を準備する',
            keyResults: [
              { description: '旅行資金300万円を貯蓄する', targetValue: 3000000, currentValue: 0 },
              { description: '英語とスペイン語の基礎を習得する', targetValue: 100, currentValue: 0 },
            ],
          },
        ],
        quarterly: [
          {
            year: 2025,
            quarter: 1,
            objective: '旅行準備の基盤を作る',
            keyResults: [
              { description: '月20万円の貯金計画を開始する', targetValue: 200000, currentValue: 0 },
            ],
          },
        ],
      };
      
      mockGenerateOKRTool.execute.mockResolvedValueOnce(mockOKRPlan);

      const result = await generateOKRPlan('goal-123', 'user-123', mockChatHistory);

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          success: true,
          planId: 'goal-123',
          okrPlan: expect.objectContaining({
            yearly: expect.arrayContaining([
              expect.objectContaining({
                year: 2025,
                objective: 'トラベルスキルと資金を準備する',
              }),
            ]),
            quarterly: expect.arrayContaining([
              expect.objectContaining({
                year: 2025,
                quarter: 1,
                objective: '旅行準備の基盤を作る',
              }),
            ]),
          }),
          analysis: expect.objectContaining({
            userMotivation: 'Test motivation',
            completionPercentage: 0,
          }),
        }),
      });
    });

    it('should return error when goal not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await generateOKRPlan('non-existent-goal', 'user-123', []);

      expect(result).toEqual({
        success: false,
        error: 'Goal not found',
      });
    });

    it('should return error when user tries to access other users goal', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await generateOKRPlan('goal-123', 'other-user', []);

      expect(result).toEqual({
        success: false,
        error: 'Goal not found',
      });
    });

    it('should handle AI generation errors', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      mockWhere.mockReturnValueOnce({ 
        limit: mockLimit,
        then: function(resolve) { 
          return Promise.resolve([]).then(resolve); 
        }
      });
      mockGenerateOKRTool.execute.mockRejectedValueOnce(new Error('AI service error'));

      const result = await generateOKRPlan('goal-123', 'user-123', []);

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate OKR plan',
      });
    });

    it('should handle invalid AI response format', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      mockWhere.mockReturnValueOnce({ 
        limit: mockLimit,
        then: function(resolve) { 
          return Promise.resolve([]).then(resolve); 
        }
      });
      mockAnalyzeChatHistoryTool.execute.mockRejectedValueOnce(new Error('Invalid response'));

      const result = await generateOKRPlan('goal-123', 'user-123', []);

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate OKR plan',
      });
    });

    it('should include chat history in AI prompt', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      mockWhere.mockReturnValueOnce({ 
        limit: mockLimit,
        then: function(resolve) { 
          return Promise.resolve([]).then(resolve); 
        }
      });

      await generateOKRPlan('goal-123', 'user-123', mockChatHistory);

      // Verify that chat history was passed to analyzeChatHistoryTool
      expect(mockAnalyzeChatHistoryTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            chatHistory: mockChatHistory,
          }),
        })
      );
    });

    it('should validate required parameters', async () => {
      const result = await generateOKRPlan('', 'user-123', []);

      expect(result).toEqual({
        success: false,
        error: 'Goal ID and User ID are required',
      });
    });
  });
});