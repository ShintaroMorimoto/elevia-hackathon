import { describe, it, expect } from 'vitest';
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { generateOKRTool } from '@/src/mastra/tools/okr-tools';

describe('Simple Mastra Workflow Test', () => {
  it('should create a single step workflow', async () => {
    // 最小限の単一ステップワークフロー
    const simpleStep = createStep({
      id: 'simple-step',
      description: 'Simple step for testing',
      inputSchema: z.object({
        goalTitle: z.string(),
        goalDescription: z.string(),
        goalDueDate: z.string(),
      }),
      outputSchema: z.object({
        yearly: z.array(z.any()),
        quarterly: z.array(z.any()),
      }),
      execute: async ({ inputData }) => {
        const runtimeContext = new RuntimeContext();
        
        const result = await generateOKRTool.execute({
          context: {
            goalTitle: inputData.goalTitle,
            goalDescription: inputData.goalDescription,
            goalDueDate: inputData.goalDueDate,
            chatInsights: { motivation: 'Test motivation' },
          },
          runtimeContext,
        });

        return result;
      },
    });

    // シンプルなワークフロー作成
    const simpleWorkflow = createWorkflow({
      id: 'simple-workflow',
      description: 'Simple workflow for testing',
      inputSchema: z.object({
        goalTitle: z.string(),
        goalDescription: z.string(),
        goalDueDate: z.string(),
      }),
      outputSchema: z.object({
        yearly: z.array(z.any()),
        quarterly: z.array(z.any()),
      }),
    })
      .then(simpleStep)
      .commit();

    expect(simpleWorkflow).toBeDefined();
    expect(simpleWorkflow.id).toBe('simple-workflow');
  });

  it('should test step creation with proper types', () => {
    const testStep = createStep({
      id: 'test-step',
      description: 'Test step',
      inputSchema: z.object({
        test: z.string(),
      }),
      outputSchema: z.object({
        result: z.string(),
      }),
      execute: async ({ inputData }) => {
        return { result: `Processed: ${inputData.test}` };
      },
    });

    expect(testStep).toBeDefined();
    expect(testStep.id).toBe('test-step');
  });
});