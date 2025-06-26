import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { conversationAgent } from '../agents/conversation-agent';
import { planningAgent } from '../agents/planning-agent';
import { goalAnalysisTool, generateQuestionTool } from '../tools/goal-tools';
import { generateOKRTool, analyzeChatHistoryTool } from '../tools/okr-tools';

// Step 1: 対話履歴の分析
const analyzeChatStep = createStep({
  id: 'analyze-chat',
  description: '対話履歴を分析して洞察を抽出',
  inputSchema: z.object({
    goalId: z.string(),
    userId: z.string(),
    chatHistory: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    ),
  }),
  outputSchema: z.object({
    userMotivation: z.string(),
    keyInsights: z.array(z.string()),
    readinessLevel: z.number(),
    recommendedActions: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const result = await analyzeChatHistoryTool.execute({
      context: {
        chatHistory: inputData.chatHistory,
      },
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
    const result = await goalAnalysisTool.execute({
      context: {
        goalId: inputData.goalId,
        userId: inputData.userId,
        chatHistory: inputData.chatHistory,
      },
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
    const result = await generateOKRTool.execute({
      context: {
        goalTitle: inputData.goalTitle,
        goalDescription: inputData.goalDescription,
        goalDueDate: inputData.goalDueDate,
        chatInsights: {
          motivation: inputData.userMotivation,
        },
      },
    });

    return result;
  },
});

// ワークフローの定義
export const okrGenerationWorkflow = createWorkflow({
  id: 'okr-generation',
  description: '対話履歴を基にOKRプランを生成',
  inputSchema: z.object({
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
  }),
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
  .then(analyzeChatStep)
  .map(({ inputData, getInitData }) => {
    const init = getInitData();
    return {
      ...inputData,
      goalId: init.goalId,
      userId: init.userId,
      chatHistory: init.chatHistory,
    };
  })
  .then(analyzeGoalStep)
  .map(({ inputData, getInitData, getStepResult }) => {
    const init = getInitData();
    const chatAnalysis = getStepResult(analyzeChatStep);

    return {
      goalId: init.goalId,
      goalTitle: init.goalTitle,
      goalDescription: init.goalDescription,
      goalDueDate: init.goalDueDate,
      userMotivation: chatAnalysis.userMotivation,
      keyInsights: chatAnalysis.keyInsights,
    };
  })
  .then(generateOKRStep)
  .map(({ inputData, getStepResult }) => {
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
