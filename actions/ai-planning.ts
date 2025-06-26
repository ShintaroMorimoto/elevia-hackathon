'use server';

import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { RuntimeContext } from '@mastra/core/di';
import { mastra } from '@/src/mastra';
import {
  generateOKRTool,
  analyzeChatHistoryTool,
} from '@/src/mastra/tools/okr-tools';
import { goalAnalysisTool } from '@/src/mastra/tools/goal-tools';
import { createYearlyOkr, createQuarterlyOkr, createKeyResult } from './okr';
import type { ActionResult } from './goals';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface KeyResult {
  description: string;
  targetValue: number;
  currentValue: number;
}

export interface YearlyOKR {
  year: number;
  objective: string;
  keyResults: KeyResult[];
}

export interface QuarterlyOKR {
  year: number;
  quarter: number;
  objective: string;
  keyResults: KeyResult[];
}

export interface OKRPlan {
  yearly: YearlyOKR[];
  quarterly: QuarterlyOKR[];
}

export interface GeneratedPlan {
  success: boolean;
  planId: string;
  okrPlan: OKRPlan;
  analysis: {
    userMotivation: string;
    keyInsights: string[];
    readinessLevel: number;
    recommendedActions: string[];
    completionPercentage: number;
  };
}

export async function generateOKRPlan(
  goalId: string,
  userId: string,
  chatHistory: ChatMessage[],
): Promise<ActionResult<GeneratedPlan>> {
  try {
    // Validation
    if (!goalId || !userId) {
      return {
        success: false,
        error: 'Goal ID and User ID are required',
      };
    }

    // Check if goal exists and belongs to user
    const goalResult = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .limit(1);

    if (goalResult.length === 0) {
      return {
        success: false,
        error: 'Goal not found',
      };
    }

    const goal = goalResult[0];

    // TEMPORARY: ワークフローが無効化されているため、個別ツールを直接使用
    const runtimeContext = new RuntimeContext();

    // Step 1: 対話履歴の分析
    const chatAnalysis = await analyzeChatHistoryTool.execute({
      context: {
        chatHistory,
      },
      runtimeContext,
    });

    // Step 2: 目標の詳細分析
    const goalAnalysis = await goalAnalysisTool.execute({
      context: {
        goalId,
        userId,
        chatHistory,
      },
      runtimeContext,
    });

    // Step 3: OKRプランの生成
    const okrPlan = await generateOKRTool.execute({
      context: {
        goalTitle: goal.title,
        goalDescription: goal.description || '',
        goalDueDate: goal.dueDate,
        chatInsights: {
          motivation: chatAnalysis.userMotivation,
        },
      },
      runtimeContext,
    });

    // OKRをデータベースに保存
    const savedOKRs = await saveOKRsToDatabase(goalId, okrPlan);

    return {
      success: true,
      data: {
        success: true,
        planId: goalId,
        okrPlan: savedOKRs,
        analysis: {
          userMotivation: chatAnalysis.userMotivation,
          keyInsights: chatAnalysis.keyInsights,
          readinessLevel: chatAnalysis.readinessLevel,
          recommendedActions: chatAnalysis.recommendedActions,
          completionPercentage: goalAnalysis.completionPercentage,
        },
      },
    };

    /* ORIGINAL WORKFLOW CODE (一時的に無効化)
    // Mastraのワークフローを実行
    const workflow = mastra.getWorkflow('okrGenerationWorkflow');
    const run = await workflow.createRunAsync();

    const result = await run.start({
      inputData: {
        goalId,
        userId,
        goalTitle: goal.title,
        goalDescription: goal.description || '',
        goalDueDate: goal.dueDate,
        chatHistory,
      },
    });

    if (result.status !== 'success') {
      return {
        success: false,
        error: 'Failed to generate OKR plan',
      };
    }

    // OKRをデータベースに保存
    const savedOKRs = await saveOKRsToDatabase(goalId, result.output.okrPlan);

    return {
      success: true,
      data: {
        success: true,
        planId: goalId,
        okrPlan: savedOKRs,
        analysis: result.output.analysis,
      },
    };
    */
  } catch (error) {
    console.error('Error generating OKR plan:', error);
    return {
      success: false,
      error: 'Failed to generate OKR plan',
    };
  }
}

async function saveOKRsToDatabase(
  goalId: string,
  okrPlan: OKRPlan,
): Promise<OKRPlan> {
  const savedYearlyOKRs = [];

  // Save yearly OKRs only (quarterly OKRs temporarily disabled due to complexity)
  for (const yearlyOKR of okrPlan.yearly) {
    const yearlyResult = await createYearlyOkr({
      goalId,
      targetYear: yearlyOKR.year,
      objective: yearlyOKR.objective,
    });

    if (yearlyResult.success) {
      // Save key results for yearly OKR
      const savedKeyResults = [];
      for (const keyResult of yearlyOKR.keyResults) {
        const keyResultData = await createKeyResult({
          yearlyOkrId: yearlyResult.data.id,
          description: keyResult.description,
          targetValue: keyResult.targetValue.toString(),
          currentValue: keyResult.currentValue.toString(),
        });

        if (keyResultData.success) {
          savedKeyResults.push({
            description: keyResult.description,
            targetValue: keyResult.targetValue,
            currentValue: keyResult.currentValue,
          });
        }
      }

      savedYearlyOKRs.push({
        year: yearlyOKR.year,
        objective: yearlyOKR.objective,
        keyResults: savedKeyResults,
      });
    }
  }

  // Return simplified structure (quarterly OKRs temporarily empty)
  return {
    yearly: savedYearlyOKRs,
    quarterly: [], // TODO: Implement quarterly OKR saving after yearly OKR IDs are available
  };
}
