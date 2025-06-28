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
const { generateNextQuestion, analyzeConversationDepth, generateConversationSummary } = await import('../../actions/ai-conversation');

describe('AI Conversation Server Actions', () => {
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
    { role: 'user', content: 'どのような準備が必要だと思いますか？' },
    { role: 'assistant', content: '語学力と資金の準備が最も重要だと思います' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockReturnValue(Promise.resolve([]));
  });

  describe('generateNextQuestion', () => {
    it('should generate AI-driven dynamic next question based on conversation context', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      
      const mockQuestionResponse = {
        question: 'これまでにどのような海外経験はありますか？',
        type: 'experience',
        depth: 3,
        reasoning: '資金準備について言及されたため、具体的な経験について深掘りする',
        shouldComplete: false,
        confidence: 0.85,
      };
      
      mockAgent.generate.mockResolvedValueOnce({ 
        text: JSON.stringify(mockQuestionResponse) 
      });

      const result = await generateNextQuestion('goal-123', 'user-123', mockChatHistory);

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          question: 'これまでにどのような海外経験はありますか？',
          type: 'experience',
          depth: 3,
          reasoning: expect.any(String),
          shouldComplete: false,
          confidence: expect.any(Number),
        }),
      });
    });

    it('should generate appropriate next question', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      
      const mockQuestionResponse = {
        question: 'これまでにどのような海外経験はありますか？',
        type: 'experience_inquiry',
        depth: 3,
      };
      
      mockAgent.generate.mockResolvedValueOnce({ 
        text: JSON.stringify(mockQuestionResponse) 
      });

      const result = await generateNextQuestion('goal-123', 'user-123', mockChatHistory);

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          question: 'これまでにどのような海外経験はありますか？',
          type: 'experience_inquiry',
          depth: 3,
        }),
      });
    });

    it('should return error when goal not found', async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await generateNextQuestion('non-existent-goal', 'user-123', []);

      expect(result).toEqual({
        success: false,
        error: 'Goal not found',
      });
    });

    it('should handle AI generation errors', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      mockAgent.generate.mockRejectedValueOnce(new Error('AI service error'));

      const result = await generateNextQuestion('goal-123', 'user-123', mockChatHistory);

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate next question',
      });
    });

    it('should handle invalid AI response format', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      mockAgent.generate.mockResolvedValueOnce({ 
        text: 'invalid json response' 
      });

      const result = await generateNextQuestion('goal-123', 'user-123', mockChatHistory);

      expect(result).toEqual({
        success: false,
        error: 'Failed to parse AI response',
      });
    });

    it('should validate required parameters', async () => {
      const result = await generateNextQuestion('', 'user-123', []);

      expect(result).toEqual({
        success: false,
        error: 'Goal ID and User ID are required',
      });
    });

    it('should include conversation context in prompt', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      mockAgent.generate.mockResolvedValueOnce({ 
        text: JSON.stringify({ question: 'test', type: 'test', depth: 1 }) 
      });

      await generateNextQuestion('goal-123', 'user-123', mockChatHistory);

      expect(mockAgent.generate).toHaveBeenCalledWith(
        expect.stringContaining('世界の文化を体験し、視野を広げたいから')
      );
    });
  });

  describe('analyzeConversationDepth', () => {
    it('should analyze conversation depth correctly', async () => {
      const mockAnalysisResponse = {
        currentDepth: 3,
        maxDepth: 5,
        isComplete: false,
        completionPercentage: 60,
        missingAspects: ['具体的な行動計画', '期間とスケジュール'],
      };
      
      mockAgent.generate.mockResolvedValueOnce({ 
        text: JSON.stringify(mockAnalysisResponse) 
      });

      const result = await analyzeConversationDepth(mockChatHistory, mockGoal);

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          currentDepth: 3,
          maxDepth: 5,
          isComplete: false,
          completionPercentage: 60,
        }),
      });
    });

    it('should handle AI analysis errors', async () => {
      mockAgent.generate.mockRejectedValueOnce(new Error('AI service error'));

      const result = await analyzeConversationDepth(mockChatHistory, mockGoal);

      expect(result).toEqual({
        success: false,
        error: 'Failed to analyze conversation depth',
      });
    });

    it('should detect when conversation is complete', async () => {
      const mockCompleteResponse = {
        currentDepth: 5,
        maxDepth: 5,
        isComplete: true,
        completionPercentage: 100,
        missingAspects: [],
      };
      
      mockAgent.generate.mockResolvedValueOnce({ 
        text: JSON.stringify(mockCompleteResponse) 
      });

      const result = await analyzeConversationDepth(mockChatHistory, mockGoal);

      expect(result.data?.isComplete).toBe(true);
      expect(result.data?.completionPercentage).toBe(100);
    });

    it('should use AI-driven dynamic assessment instead of fixed depth limits', async () => {
      const mockDynamicResponse = {
        informationSufficiency: 0.85,
        isReadyToProceed: true,
        missingCriticalInfo: [],
        conversationQuality: 'high',
        suggestedNextAction: 'proceed_to_planning',
        reasoning: 'ユーザーの動機、経験、リソースについて十分な情報が収集されました',
      };
      
      mockAgent.generate.mockResolvedValueOnce({ 
        text: JSON.stringify(mockDynamicResponse) 
      });

      const result = await analyzeConversationDepth(mockChatHistory, mockGoal);

      expect(result.data).toEqual(expect.objectContaining({
        informationSufficiency: expect.any(Number),
        isReadyToProceed: expect.any(Boolean),
        conversationQuality: expect.any(String),
        suggestedNextAction: expect.any(String),
        reasoning: expect.any(String),
      }));
    });
  });

  describe('generateConversationSummary', () => {
    it('should generate conversation summary', async () => {
      const mockSummaryResponse = {
        userMotivation: '世界の文化を体験し、視野を広げたい',
        keyInsights: ['語学力と資金準備の重要性を認識', '海外経験が限定的'],
        readinessLevel: 7,
        recommendedActions: ['英語学習の開始', '貯金計画の策定'],
      };
      
      mockAgent.generate.mockResolvedValueOnce({ 
        text: JSON.stringify(mockSummaryResponse) 
      });

      const result = await generateConversationSummary(mockChatHistory, mockGoal);

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          userMotivation: '世界の文化を体験し、視野を広げたい',
          keyInsights: expect.arrayContaining(['語学力と資金準備の重要性を認識']),
          readinessLevel: 7,
        }),
      });
    });

    it('should handle AI summary generation errors', async () => {
      mockAgent.generate.mockRejectedValueOnce(new Error('AI service error'));

      const result = await generateConversationSummary(mockChatHistory, mockGoal);

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate conversation summary',
      });
    });

    it('should validate conversation data', async () => {
      const result = await generateConversationSummary([], mockGoal);

      expect(result).toEqual({
        success: false,
        error: 'Chat history is required',
      });
    });
  });
});