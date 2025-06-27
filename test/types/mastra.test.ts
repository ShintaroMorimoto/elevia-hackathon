import { describe, it, expect } from 'vitest';
import {
  ChatMessage,
  KeyResult,
  YearlyOKR,
  QuarterlyOKR,
  OKRPlan,
  GeneratedPlan,
  NextQuestionData,
  ConversationAnalysis,
  ConversationSummary,
  validateChatMessage,
  validateKeyResult,
  validateYearlyOKR,
  validateQuarterlyOKR,
  validateOKRPlan,
  validateGeneratedPlan,
} from '@/types/mastra';

describe('Mastra Types', () => {
  describe('ChatMessage', () => {
    it('should have correct structure', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Test message',
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('Test message');
    });

    it('should validate valid ChatMessage', () => {
      const validMessage: ChatMessage = {
        role: 'assistant',
        content: 'AI response',
      };

      expect(() => validateChatMessage(validMessage)).not.toThrow();
    });

    it('should reject invalid ChatMessage', () => {
      const invalidMessage = {
        role: '',
        content: '',
      };

      expect(() => validateChatMessage(invalidMessage as ChatMessage)).toThrow();
    });
  });

  describe('KeyResult', () => {
    it('should have correct structure', () => {
      const keyResult: KeyResult = {
        description: 'Test key result',
        targetValue: 100,
        currentValue: 50,
      };

      expect(keyResult.description).toBe('Test key result');
      expect(keyResult.targetValue).toBe(100);
      expect(keyResult.currentValue).toBe(50);
    });

    it('should validate valid KeyResult', () => {
      const validKeyResult: KeyResult = {
        description: 'Achieve 80% completion',
        targetValue: 80,
        currentValue: 20,
      };

      expect(() => validateKeyResult(validKeyResult)).not.toThrow();
    });

    it('should reject invalid KeyResult with negative values', () => {
      const invalidKeyResult: KeyResult = {
        description: 'Invalid result',
        targetValue: -10,
        currentValue: -5,
      };

      expect(() => validateKeyResult(invalidKeyResult)).toThrow();
    });
  });

  describe('YearlyOKR', () => {
    it('should have correct structure', () => {
      const yearlyOKR: YearlyOKR = {
        year: 2025,
        objective: 'Test objective',
        keyResults: [
          {
            description: 'Key result 1',
            targetValue: 100,
            currentValue: 0,
          },
        ],
      };

      expect(yearlyOKR.year).toBe(2025);
      expect(yearlyOKR.objective).toBe('Test objective');
      expect(yearlyOKR.keyResults).toHaveLength(1);
    });

    it('should validate valid YearlyOKR', () => {
      const validYearlyOKR: YearlyOKR = {
        year: 2025,
        objective: 'Complete project X',
        keyResults: [
          { description: 'KR 1', targetValue: 100, currentValue: 0 },
          { description: 'KR 2', targetValue: 50, currentValue: 10 },
        ],
      };

      expect(() => validateYearlyOKR(validYearlyOKR)).not.toThrow();
    });
  });

  describe('OKRPlan', () => {
    it('should have correct structure', () => {
      const okrPlan: OKRPlan = {
        yearly: [
          {
            year: 2025,
            objective: 'Yearly objective',
            keyResults: [
              { description: 'KR 1', targetValue: 100, currentValue: 0 },
            ],
          },
        ],
        quarterly: [
          {
            year: 2025,
            quarter: 1,
            objective: 'Q1 objective',
            keyResults: [
              { description: 'Q1 KR 1', targetValue: 25, currentValue: 0 },
            ],
          },
        ],
      };

      expect(okrPlan.yearly).toHaveLength(1);
      expect(okrPlan.quarterly).toHaveLength(1);
    });

    it('should validate valid OKRPlan', () => {
      const validPlan: OKRPlan = {
        yearly: [
          {
            year: 2025,
            objective: 'Annual goal',
            keyResults: [
              { description: 'Annual KR', targetValue: 100, currentValue: 0 },
            ],
          },
        ],
        quarterly: [],
      };

      expect(() => validateOKRPlan(validPlan)).not.toThrow();
    });
  });

  describe('GeneratedPlan', () => {
    it('should have correct structure', () => {
      const generatedPlan: GeneratedPlan = {
        success: true,
        planId: 'plan-123',
        okrPlan: {
          yearly: [],
          quarterly: [],
        },
        analysis: {
          userMotivation: 'Strong motivation',
          keyInsights: ['Insight 1', 'Insight 2'],
          readinessLevel: 8,
          recommendedActions: ['Action 1'],
          completionPercentage: 75,
        },
      };

      expect(generatedPlan.success).toBe(true);
      expect(generatedPlan.planId).toBe('plan-123');
      expect(generatedPlan.analysis.readinessLevel).toBe(8);
    });

    it('should validate valid GeneratedPlan', () => {
      const validPlan: GeneratedPlan = {
        success: true,
        planId: 'valid-plan-id',
        okrPlan: {
          yearly: [],
          quarterly: [],
        },
        analysis: {
          userMotivation: 'Test motivation',
          keyInsights: ['Test insight'],
          readinessLevel: 7,
          recommendedActions: ['Test action'],
          completionPercentage: 50,
        },
      };

      expect(() => validateGeneratedPlan(validPlan)).not.toThrow();
    });
  });

  describe('NextQuestionData', () => {
    it('should have correct structure', () => {
      const questionData: NextQuestionData = {
        question: 'What is your motivation?',
        type: 'motivation',
        depth: 2,
      };

      expect(questionData.question).toBe('What is your motivation?');
      expect(questionData.type).toBe('motivation');
      expect(questionData.depth).toBe(2);
    });
  });

  describe('ConversationAnalysis', () => {
    it('should have correct structure', () => {
      const analysis: ConversationAnalysis = {
        currentDepth: 3,
        maxDepth: 5,
        isComplete: false,
        completionPercentage: 60,
        missingAspects: ['motivation', 'timeline'],
      };

      expect(analysis.currentDepth).toBe(3);
      expect(analysis.maxDepth).toBe(5);
      expect(analysis.isComplete).toBe(false);
      expect(analysis.missingAspects).toContain('motivation');
    });
  });

  describe('ConversationSummary', () => {
    it('should have correct structure', () => {
      const summary: ConversationSummary = {
        userMotivation: 'High motivation',
        keyInsights: ['User is committed', 'Clear timeline'],
        readinessLevel: 8,
        recommendedActions: ['Start planning', 'Set milestones'],
      };

      expect(summary.userMotivation).toBe('High motivation');
      expect(summary.keyInsights).toHaveLength(2);
      expect(summary.readinessLevel).toBe(8);
      expect(summary.recommendedActions).toHaveLength(2);
    });
  });
});