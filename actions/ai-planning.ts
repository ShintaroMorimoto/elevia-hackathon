'use server';

import { db } from '@/lib/db';
import { goals, yearlyOkrs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { RuntimeContext } from '@mastra/core/di';
import {
  generateOKRTool,
  analyzeChatHistoryTool,
} from '@/src/mastra/tools/okr-tools';
import { goalAnalysisTool } from '@/src/mastra/tools/goal-tools';
import { createYearlyOkr, createQuarterlyOkr, createKeyResult } from './okr';
import type { ActionResult } from './goals';
import type { ChatMessage, OKRPlan, GeneratedPlan } from '@/types/mastra';

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

    // まず既存のOKRをチェック
    const existingOKRs = await db
      .select()
      .from(yearlyOkrs)
      .where(eq(yearlyOkrs.goalId, goalId));

    // console.log('🔍 DEBUG: 既存のyearly OKRs:', existingOKRs);
    // console.log('🔍 DEBUG: 既存の年一覧:', existingOKRs.map((o) => o.targetYear));

    // 既存OKRがある場合は新規作成を拒否（安全な方式）
    if (existingOKRs.length > 0) {
      console.log('❌ 既存OKRが存在するため、新規作成を拒否します');
      return {
        success: false,
        error:
          '既存のOKR計画が存在します。新しい計画を作成するには、既存の計画を削除してから再実行してください。',
      };
    }

    // 年の重複チェック（念のため）
    const existingYears = existingOKRs.map((o) => o.targetYear);
    const uniqueYears = new Set(existingYears);
    if (existingYears.length !== uniqueYears.size) {
      console.warn('⚠️ データベースに年の重複が検出されました:', existingYears);
    }

    // TEMPORARY: ワークフローが無効化されているため、個別ツールを直接使用
    // RuntimeContextは型エラー回避のため一時的に再追加
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
  console.log('🔍 DEBUG: 保存するOKRプラン:', okrPlan);
  console.log('🔍 DEBUG: yearly OKRs数:', okrPlan.yearly.length);
  console.log(
    '🔍 DEBUG: yearly年一覧:',
    okrPlan.yearly.map((y) => y.year),
  );

  const savedYearlyOKRs = [];
  const savedQuarterlyOKRs = [];

  // Save yearly OKRs first
  for (const yearlyOKR of okrPlan.yearly) {
    console.log('🔍 DEBUG: 保存中のyearly OKR:', yearlyOKR);
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
          unit: keyResult.unit || '',
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

      // Save quarterly OKRs for this yearly OKR
      const relatedQuarterlyOKRs = okrPlan.quarterly.filter(
        (qOKR) => qOKR.year === yearlyOKR.year,
      );

      for (const quarterlyOKR of relatedQuarterlyOKRs) {
        const quarterlyResult = await createQuarterlyOkr({
          yearlyOkrId: yearlyResult.data.id,
          targetYear: quarterlyOKR.year,
          targetQuarter: quarterlyOKR.quarter,
          objective: quarterlyOKR.objective,
        });

        if (quarterlyResult.success) {
          // Save key results for quarterly OKR
          const quarterlyKeyResults = [];
          for (const keyResult of quarterlyOKR.keyResults) {
            const keyResultData = await createKeyResult({
              quarterlyOkrId: quarterlyResult.data.id,
              description: keyResult.description,
              targetValue: keyResult.targetValue.toString(),
              currentValue: keyResult.currentValue.toString(),
              unit: keyResult.unit || '',
            });

            if (keyResultData.success) {
              quarterlyKeyResults.push({
                description: keyResult.description,
                targetValue: keyResult.targetValue,
                currentValue: keyResult.currentValue,
              });
            }
          }
          savedQuarterlyOKRs.push({
            year: quarterlyOKR.year,
            quarter: quarterlyOKR.quarter,
            objective: quarterlyOKR.objective,
            keyResults: quarterlyKeyResults,
          });
        }
      }
    }
  }

  return {
    yearly: savedYearlyOKRs,
    quarterly: savedQuarterlyOKRs,
  };
}
