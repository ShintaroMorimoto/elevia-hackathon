// Plan generation helpers for Mastra integration
// TDD Green phase - minimal implementation to make tests pass

import { generateOKRPlan } from '@/actions/ai-planning';
import {
  createYearlyOkr,
  createQuarterlyOkr,
  createKeyResult,
} from '@/actions/okr';
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
  goalData: { title: string; deadline: string },
  chatHistory: Array<{ role: string; content: string }>,
): Promise<GeneratedPlan> {
  // Generate OKR plan using Mastra
  const planResult = await generateOKRPlan(goalId, userId, chatHistory);
  if (!planResult.success) {
    throw new Error('AI generation failed');
  }

  const generatedPlan = planResult.data;
  const savedYearlyOKRs = [];

  // Save yearly OKRs to database
  for (const yearlyOKR of generatedPlan.yearly) {
    const yearlyResult = await createYearlyOkr({
      goalId,
      targetYear: yearlyOKR.year,
      objective: yearlyOKR.objective,
    });

    if (!yearlyResult.success) {
      throw new Error('Failed to save yearly OKR');
    }

    const yearlyId = yearlyResult.data.id;

    // Save key results for yearly OKR
    for (const keyResult of yearlyOKR.keyResults) {
      await createKeyResult({
        yearlyOkrId: yearlyId,
        description: keyResult.description,
        targetValue: keyResult.targetValue.toString(),
        currentValue: keyResult.currentValue.toString(),
      });
    }

    savedYearlyOKRs.push(yearlyOKR);
  }

  return {
    success: true,
    planId: goalId,
    yearlyOKRs: savedYearlyOKRs,
  };
}
