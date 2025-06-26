import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Goal } from '../../lib/db/schema';

// Mock Mastra
const mockAgent = {
  generate: vi.fn(),
};

vi.mock('@mastra/core', () => ({
  Agent: vi.fn().mockImplementation(() => mockAgent),
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
mockWhere.mockReturnValue({ limit: mockLimit });

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
    mockLimit.mockReturnValue(Promise.resolve([]));
  });

  describe('generateOKRPlan', () => {
    it('should generate OKR plan successfully', async () => {
      // Mock goal exists
      mockLimit.mockResolvedValueOnce([mockGoal]);
      
      // Mock AI response
      const mockAIResponse = {
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
      
      mockAgent.generate.mockResolvedValueOnce({ 
        text: JSON.stringify(mockAIResponse) 
      });

      const result = await generateOKRPlan('goal-123', 'user-123', mockChatHistory);

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
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
      mockAgent.generate.mockRejectedValueOnce(new Error('AI service error'));

      const result = await generateOKRPlan('goal-123', 'user-123', []);

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate OKR plan',
      });
    });

    it('should handle invalid AI response format', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      mockAgent.generate.mockResolvedValueOnce({ 
        text: 'invalid json response' 
      });

      const result = await generateOKRPlan('goal-123', 'user-123', []);

      expect(result).toEqual({
        success: false,
        error: 'Failed to parse AI response',
      });
    });

    it('should include chat history in AI prompt', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      mockAgent.generate.mockResolvedValueOnce({ 
        text: JSON.stringify({ yearly: [], quarterly: [] }) 
      });

      await generateOKRPlan('goal-123', 'user-123', mockChatHistory);

      expect(mockAgent.generate).toHaveBeenCalledWith(
        expect.stringContaining('世界の文化を体験し、視野を広げたいから')
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