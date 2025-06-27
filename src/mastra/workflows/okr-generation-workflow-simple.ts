import { createWorkflow, createStep } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { generateOKRTool, analyzeChatHistoryTool } from '../tools/okr-tools';
import { goalAnalysisTool } from '../tools/goal-tools';

// シンプルな入力スキーマ
const workflowInputSchema = z.object({
  goalId: z.string(),
  userId: z.string(),
  goalTitle: z.string(),
  goalDescription: z.string(),
  goalDueDate: z.string(),
  chatHistory: z.array(
    z.object({
      role: z.string(),
      content: z.string(),
    }),
  ),
});

// ステップ1: OKRプランの生成（他のステップの結果を待たない単一ステップ）
const generateOKRStep = createStep({
  id: 'generate-okr-simple',
  description: 'Generate OKR plan directly',
  inputSchema: workflowInputSchema,
  outputSchema: z.object({
    okrPlan: z.object({
      yearly: z.array(z.any()),
      quarterly: z.array(z.any()),
    }),
    analysis: z.object({
      userMotivation: z.string(),
      keyInsights: z.array(z.string()),
      readinessLevel: z.number(),
      recommendedActions: z.array(z.string()),
      completionPercentage: z.number(),
    }),
  }),
  execute: async ({ inputData }) => {
    const runtimeContext = new RuntimeContext();

    // 並列実行で分析とOKR生成を同時に行う
    const [chatAnalysis, goalAnalysis, okrPlan] = await Promise.all([
      analyzeChatHistoryTool.execute({
        context: { chatHistory: inputData.chatHistory },
        runtimeContext,
      }),
      goalAnalysisTool.execute({
        context: {
          goalId: inputData.goalId,
          userId: inputData.userId,
          chatHistory: inputData.chatHistory,
        },
        runtimeContext,
      }),
      generateOKRTool.execute({
        context: {
          goalTitle: inputData.goalTitle,
          goalDescription: inputData.goalDescription,
          goalDueDate: inputData.goalDueDate,
          chatInsights: { motivation: 'Processing...' },
        },
        runtimeContext,
      }),
    ]);

    return {
      okrPlan,
      analysis: {
        userMotivation: chatAnalysis.userMotivation,
        keyInsights: chatAnalysis.keyInsights,
        readinessLevel: chatAnalysis.readinessLevel,
        recommendedActions: chatAnalysis.recommendedActions,
        completionPercentage: goalAnalysis.completionPercentage,
      },
    };
  },
});

// シンプルなワークフロー（単一ステップ）
export const okrGenerationWorkflowSimple = createWorkflow({
  id: 'okr-generation-simple',
  description: 'Generate OKR plan with single step',
  inputSchema: workflowInputSchema,
  outputSchema: z.object({
    okrPlan: z.object({
      yearly: z.array(z.any()),
      quarterly: z.array(z.any()),
    }),
    analysis: z.object({
      userMotivation: z.string(),
      keyInsights: z.array(z.string()),
      readinessLevel: z.number(),
      recommendedActions: z.array(z.string()),
      completionPercentage: z.number(),
    }),
  }),
})
  .then(generateOKRStep)
  .commit();