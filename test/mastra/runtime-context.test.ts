import { describe, it, expect } from 'vitest';
import { RuntimeContext } from '@mastra/core/di';
import {
  generateOKRTool,
  analyzeChatHistoryTool,
} from '@/src/mastra/tools/okr-tools';

describe('Mastra RuntimeContext Tests', () => {
  describe('generateOKRTool', () => {
    it('should work without RuntimeContext', async () => {
      const context = {
        goalTitle: 'Test Goal',
        goalDescription: 'Test Description',
        goalDueDate: '2025-12-31',
        chatInsights: {
          motivation: 'High motivation',
        },
      };

      const result = await generateOKRTool.execute({
        context,
        runtimeContext: new RuntimeContext(),
      });

      expect(result).toBeDefined();
      expect(result.yearly).toBeInstanceOf(Array);
      expect(result.quarterly).toBeInstanceOf(Array);
    });

    it('should work with RuntimeContext', async () => {
      const runtimeContext = new RuntimeContext();
      const context = {
        goalTitle: 'Test Goal',
        goalDescription: 'Test Description',
        goalDueDate: '2025-12-31',
        chatInsights: {
          motivation: 'High motivation',
        },
      };

      const result = await generateOKRTool.execute({
        context,
        runtimeContext,
      });

      expect(result).toBeDefined();
      expect(result.yearly).toBeInstanceOf(Array);
      expect(result.quarterly).toBeInstanceOf(Array);
    });
  });

  describe('analyzeChatHistoryTool', () => {
    it('should work without RuntimeContext', async () => {
      const context = {
        chatHistory: [
          { role: 'user', content: 'I want to achieve my goal' },
          { role: 'ai', content: 'What is your motivation?' },
          { role: 'user', content: 'I want to grow and become better' },
        ],
      };

      const result = await analyzeChatHistoryTool.execute({
        context,
        runtimeContext: new RuntimeContext(),
      });

      expect(result).toBeDefined();
      expect(result.userMotivation).toBe('目標を通じて成長したい');
      expect(result.keyInsights).toBeInstanceOf(Array);
      expect(result.readinessLevel).toBeGreaterThan(0);
      expect(result.recommendedActions).toBeInstanceOf(Array);
    });

    it('should work with RuntimeContext', async () => {
      const runtimeContext = new RuntimeContext();
      const context = {
        chatHistory: [
          { role: 'user', content: 'I want to achieve my goal' },
          { role: 'ai', content: 'What is your motivation?' },
          { role: 'user', content: 'I want to grow and become better' },
        ],
      };

      const result = await analyzeChatHistoryTool.execute({
        context,
        runtimeContext,
      });

      expect(result).toBeDefined();
      expect(result.userMotivation).toBe('目標を通じて成長したい');
      expect(result.keyInsights).toBeInstanceOf(Array);
      expect(result.readinessLevel).toBeGreaterThan(0);
      expect(result.recommendedActions).toBeInstanceOf(Array);
    });
  });

  describe('RuntimeContext creation', () => {
    it('should create RuntimeContext without errors', () => {
      expect(() => {
        const runtimeContext = new RuntimeContext();
        expect(runtimeContext).toBeDefined();
      }).not.toThrow();
    });
  });
});
