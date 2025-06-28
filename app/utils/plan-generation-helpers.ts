// Plan generation helpers for Mastra integration
// TDD Green phase - minimal implementation to make tests pass

import { generateOKRPlan } from '@/actions/ai-planning';
import { getGoal } from '@/actions/goals';
import { getChatMessages } from '@/actions/chat';

export interface PlanInitResult {
  goalData: {
    title: string;
    deadline: string;
  };
  chatHistory: Array<{
    role: string;
    content: string;
  }>;
  isReady: boolean;
}

export interface GeneratedPlan {
  success: boolean;
  planId: string;
  yearlyOKRs: Array<{
    year: number;
    objective: string;
    keyResults: Array<{
      description: string;
      targetValue: number;
      currentValue: number;
    }>;
    quarterlyOKRs?: Array<{
      quarter: number;
      objective: string;
      keyResults: Array<{
        description: string;
        targetValue: number;
        currentValue: number;
      }>;
    }>;
  }>;
}

export async function initializePlanGeneration(
  goalId: string,
  userId: string,
  sessionId: string,
): Promise<PlanInitResult> {
  // Get goal data
  const goalResult = await getGoal(goalId, userId);
  if (!goalResult.success) {
    throw new Error('Goal not found');
  }

  // Get chat history
  const chatResult = await getChatMessages(sessionId);
  if (!chatResult.success) {
    throw new Error('Failed to get chat history');
  }

  return {
    goalData: {
      title: goalResult.data.title,
      deadline: goalResult.data.dueDate,
    },
    chatHistory: chatResult.data.map((msg) => ({
      role: msg.senderType,
      content: msg.content,
    })),
    isReady: true,
  };
}

export async function generatePlanWithMastra(
  goalId: string,
  userId: string,
  _goalData: { title: string; deadline: string },
  chatHistory: Array<{ role: string; content: string }>,
): Promise<GeneratedPlan> {
  // Generate OKR plan using Mastra
  const planResult = await generateOKRPlan(goalId, userId, chatHistory);
  if (!planResult.success) {
    // 既存OKRが存在する場合の特別なエラー処理
    if (planResult.error?.includes('既存のOKR計画が存在します')) {
      throw new Error('EXISTING_PLAN_FOUND');
    }
    throw new Error(planResult.error || 'AI generation failed');
  }

  const generatedPlan = planResult.data;

  // 注意: OKRの保存は ai-planning.ts の saveOKRsToDatabase で既に完了している
  // ここでは重複保存を避けるため、生成されたプランデータのみを返す
  return {
    success: true,
    planId: goalId,
    yearlyOKRs: generatedPlan.okrPlan.yearly,
  };
}
