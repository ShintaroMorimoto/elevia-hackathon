'use server';

import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { mastra } from '@/src/mastra';
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

export async function generateOKRPlan(
  goalId: string,
  userId: string,
  chatHistory: ChatMessage[],
): Promise<ActionResult<OKRPlan>> {
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

    // Mastraのワークフローを実行
    const workflow = mastra.getWorkflow('okrGenerationWorkflow');
    const run = await workflow.createRunAsync();

    const result = await run.start({
      inputData: {
        goalId: goal.id,
        userId: goal.userId,
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

    // 結果を期待される形式に変換
    const okrPlan = result.result?.okrPlan;

    // Validate response structure
    if (!okrPlan?.yearly || !okrPlan?.quarterly) {
      return {
        success: false,
        error: 'Invalid OKR plan structure',
      };
    }

    return {
      success: true,
      data: okrPlan,
    };
  } catch (error) {
    console.error('Error generating OKR plan:', error);
    return {
      success: false,
      error: 'Failed to generate OKR plan',
    };
  }
}
