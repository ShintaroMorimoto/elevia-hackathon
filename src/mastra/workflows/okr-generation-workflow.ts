// TEMPORARY: ワークフロー全体を無効化（型エラー修正中）
// Phase 1の緊急修正として、個別ツール実行（Server Actions）を使用

/*
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { conversationAgent } from '../agents/conversation-agent';
import { planningAgent } from '../agents/planning-agent';
import { goalAnalysisTool, generateQuestionTool } from '../tools/goal-tools';
import { generateOKRTool, analyzeChatHistoryTool } from '../tools/okr-tools';

// ワークフロー全体の入力スキーマを統一
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

// Step 1: 対話履歴の分析
const analyzeChatStep = createStep({
  id: 'analyze-chat',
  description: '対話履歴を分析して洞察を抽出',
  inputSchema: workflowInputSchema,
  outputSchema: z.object({
    userMotivation: z.string(),
    keyInsights: z.array(z.string()),
    readinessLevel: z.number(),
    recommendedActions: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const runtimeContext = new RuntimeContext();
    
    const result = await analyzeChatHistoryTool.execute({
      context: {
        chatHistory: inputData.chatHistory,
      },
      runtimeContext,
    });

    return result;
  },
});

// Step 2: 目標の詳細分析
const analyzeGoalStep = createStep({
  id: 'analyze-goal',
  description: '目標の詳細を分析',
  inputSchema: z.object({
    goalId: z.string(),
    userId: z.string(),
    chatHistory: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    ),
    userMotivation: z.string(),
    keyInsights: z.array(z.string()),
  }),
  outputSchema: z.object({
    currentDepth: z.number(),
    maxDepth: z.number(),
    isComplete: z.boolean(),
    completionPercentage: z.number(),
    missingAspects: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const runtimeContext = new RuntimeContext();
    
    const result = await goalAnalysisTool.execute({
      context: {
        goalId: inputData.goalId,
        userId: inputData.userId,
        chatHistory: inputData.chatHistory,
      },
      runtimeContext,
    });

    return result;
  },
});

// Step 3: OKRプランの生成
const generateOKRStep = createStep({
  id: 'generate-okr',
  description: 'OKRプランを生成',
  inputSchema: z.object({
    goalId: z.string(),
    goalTitle: z.string(),
    goalDescription: z.string(),
    goalDueDate: z.string(),
    userMotivation: z.string(),
    keyInsights: z.array(z.string()),
  }),
  outputSchema: z.object({
    yearly: z.array(
      z.object({
        year: z.number(),
        objective: z.string(),
        keyResults: z.array(
          z.object({
            description: z.string(),
            targetValue: z.number(),
            currentValue: z.number(),
          }),
        ),
      }),
    ),
    quarterly: z.array(
      z.object({
        year: z.number(),
        quarter: z.number(),
        objective: z.string(),
        keyResults: z.array(
          z.object({
            description: z.string(),
            targetValue: z.number(),
            currentValue: z.number(),
          }),
        ),
      }),
    ),
  }),
  execute: async ({ inputData }) => {
    const runtimeContext = new RuntimeContext();
    
    const result = await generateOKRTool.execute({
      context: {
        goalTitle: inputData.goalTitle,
        goalDescription: inputData.goalDescription,
        goalDueDate: inputData.goalDueDate,
        chatInsights: {
          motivation: inputData.userMotivation,
        },
      },
      runtimeContext,
    });

    return result;
  },
});

// ワークフローの定義（データフロー修正）
export const okrGenerationWorkflow = createWorkflow({
  id: 'okr-generation',
  description: '対話履歴を基にOKRプランを生成',
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
  steps: [analyzeChatStep, analyzeGoalStep, generateOKRStep],
})
  .then(analyzeChatStep)
  .map({
    goalId: { step: analyzeChatStep },
    userId: { step: analyzeChatStep },
    chatHistory: { step: analyzeChatStep },
    userMotivation: { step: analyzeChatStep, path: 'userMotivation' },
    keyInsights: { step: analyzeChatStep, path: 'keyInsights' },
    readinessLevel: { step: analyzeChatStep, path: 'readinessLevel' },
    recommendedActions: { step: analyzeChatStep, path: 'recommendedActions' },
  })
  .then(analyzeGoalStep)
  .map({
    goalId: { runtimeContextPath: 'goalId' },
    goalTitle: { runtimeContextPath: 'goalTitle' },
    goalDescription: { runtimeContextPath: 'goalDescription' },
    goalDueDate: { runtimeContextPath: 'goalDueDate' },
    userMotivation: { step: analyzeChatStep, path: 'userMotivation' },
    keyInsights: { step: analyzeChatStep, path: 'keyInsights' },
  })
  .then(generateOKRStep)
  .map(async ({ getStepResult }) => {
    const chatAnalysis = getStepResult(analyzeChatStep);
    const goalAnalysis = getStepResult(analyzeGoalStep);
    const okrPlan = getStepResult(generateOKRStep);

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
  })
  .commit();
*/

// PLACEHOLDER: ワークフローが修正されるまでの一時的なエクスポート
export const okrGenerationWorkflow = null;
