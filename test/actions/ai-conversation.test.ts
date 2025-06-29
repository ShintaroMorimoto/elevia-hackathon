import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Goal } from '../../lib/db/schema';

// Mock Mastra tools
const mockGoalAnalysisTool = {
  execute: vi.fn(),
};

const mockGenerateQuestionTool = {
  execute: vi.fn(),
};

const mockAnalyzeChatHistoryTool = {
  execute: vi.fn(),
};

vi.mock('../../src/mastra/tools/goal-tools', () => ({
  goalAnalysisTool: mockGoalAnalysisTool,
  generateQuestionTool: mockGenerateQuestionTool,
}));

vi.mock('../../src/mastra/tools/okr-tools', () => ({
  analyzeChatHistoryTool: mockAnalyzeChatHistoryTool,
}));

// Mock RuntimeContext
vi.mock('@mastra/core/di', () => ({
  RuntimeContext: vi.fn().mockImplementation(() => ({})),
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
    // Default: return mock goal data for database queries
    mockLimit.mockReturnValue(Promise.resolve([mockGoal]));
    
    // Setup default mock responses for Mastra tools
    mockGoalAnalysisTool.execute.mockResolvedValue({
      currentDepth: 2,
      maxDepth: 5,
      isComplete: false,
      completionPercentage: 40,
      missingAspects: ['resources', 'timeline'],
      informationSufficiency: 0.4,
      isReadyToProceed: false,
      missingCriticalInfo: ['資金計画', '具体的なスケジュール'],
      conversationQuality: 'medium',
      suggestedNextAction: 'continue_conversation',
      reasoning: 'さらに詳細情報が必要です',
    });
    
    mockGenerateQuestionTool.execute.mockResolvedValue({
      question: 'どのような予算を想定していますか？',
      type: 'resources',
      depth: 3,
      reasoning: 'リソース情報が不足しています',
      shouldComplete: false,
      confidence: 0.8,
    });

    mockAnalyzeChatHistoryTool.execute.mockResolvedValue({
      userMotivation: 'Test motivation',
      keyInsights: ['Test insight'],
      readinessLevel: 8,
      recommendedActions: ['Test action'],
    });
  });

  describe('generateNextQuestion', () => {
    it('should generate AI-driven dynamic next question based on conversation context', async () => {
      const mockQuestionResponse = {
        question: 'これまでにどのような海外経験はありますか？',
        type: 'experience',
        depth: 3,
        reasoning: '資金準備について言及されたため、具体的な経験について深掘りする',
        shouldComplete: false,
        confidence: 0.85,
      };
      
      mockGenerateQuestionTool.execute.mockResolvedValueOnce(mockQuestionResponse);

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
      const mockQuestionResponse = {
        question: 'これまでにどのような海外経験はありますか？',
        type: 'experience_inquiry',
        depth: 3,
        reasoning: '経験について探る必要があります',
        shouldComplete: false,
        confidence: 0.8,
      };
      
      mockGenerateQuestionTool.execute.mockResolvedValueOnce(mockQuestionResponse);

      const result = await generateNextQuestion('goal-123', 'user-123', mockChatHistory);

      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          question: 'これまでにどのような海外経験はありますか？',
          type: 'experience_inquiry',
          depth: 3,
          reasoning: expect.any(String),
          shouldComplete: false,
          confidence: expect.any(Number),
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
      mockGenerateQuestionTool.execute.mockRejectedValueOnce(new Error('AI service error'));

      const result = await generateNextQuestion('goal-123', 'user-123', mockChatHistory);

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate next question',
      });
    });

    it('should handle invalid AI response format', async () => {
      mockLimit.mockResolvedValueOnce([mockGoal]);
      mockGoalAnalysisTool.execute.mockRejectedValueOnce(new Error('Invalid response'));

      const result = await generateNextQuestion('goal-123', 'user-123', mockChatHistory);

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate next question',
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

      await generateNextQuestion('goal-123', 'user-123', mockChatHistory);

      // Verify that chat history was passed to goalAnalysisTool
      expect(mockGoalAnalysisTool.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            chatHistory: mockChatHistory,
          }),
        })
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
      
      mockGoalAnalysisTool.execute.mockResolvedValueOnce(mockAnalysisResponse);

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
      mockGoalAnalysisTool.execute.mockRejectedValueOnce(new Error('AI service error'));

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
      
      mockGoalAnalysisTool.execute.mockResolvedValueOnce(mockCompleteResponse);

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
      
      mockGoalAnalysisTool.execute.mockResolvedValueOnce(mockDynamicResponse);

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
      
      mockAnalyzeChatHistoryTool.execute.mockResolvedValueOnce(mockSummaryResponse);

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
      mockAnalyzeChatHistoryTool.execute.mockRejectedValueOnce(new Error('AI service error'));

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