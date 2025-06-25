'use server';

import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
// import { Agent } from '@mastra/core';
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
  chatHistory: ChatMessage[]
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

    // Prepare AI prompt
    const chatContext = chatHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
あなたは目標達成支援の専門家です。以下の情報をもとに、ユーザーの目標を達成するための年次・四半期のOKRを生成してください。

目標情報:
- タイトル: ${goal.title}
- 説明: ${goal.description}
- 達成期限: ${goal.dueDate}

ユーザーとの対話履歴:
${chatContext}

以下のJSON形式で応答してください:
{
  "yearly": [
    {
      "year": 2025,
      "objective": "具体的で測定可能な年次目標",
      "keyResults": [
        {
          "description": "具体的な成果指標",
          "targetValue": 100,
          "currentValue": 0
        }
      ]
    }
  ],
  "quarterly": [
    {
      "year": 2025,
      "quarter": 1,
      "objective": "四半期の具体的目標",
      "keyResults": [
        {
          "description": "四半期の成果指標",
          "targetValue": 25,
          "currentValue": 0
        }
      ]
    }
  ]
}

重要な要件:
1. OKRの原則に従って野心的だが現実的な目標を設定
2. Key Resultsは定量的で測定可能
3. 目標達成期限まで適切に分割
4. ユーザーの対話履歴を反映したパーソナライズ
5. JSON形式のみで応答（説明文は不要）
`;

    // Generate OKR using AI (Mock for now)
    // TODO: Integrate with Mastra/AI service
    const mockOkrPlan: OKRPlan = {
      yearly: [
        {
          year: 2025,
          objective: `${goal.title}の基盤を構築する`,
          keyResults: [
            { description: '必要なスキルと知識を習得する', targetValue: 100, currentValue: 0 },
            { description: '具体的な行動計画を策定する', targetValue: 100, currentValue: 0 },
          ],
        },
        {
          year: 2026,
          objective: `${goal.title}の実行段階に入る`,
          keyResults: [
            { description: '目標の50%を達成する', targetValue: 50, currentValue: 0 },
            { description: '必要なリソースを確保する', targetValue: 100, currentValue: 0 },
          ],
        },
      ],
      quarterly: [
        {
          year: 2025,
          quarter: 1,
          objective: '目標達成のための準備を開始する',
          keyResults: [
            { description: '情報収集と計画策定を完了する', targetValue: 100, currentValue: 0 },
          ],
        },
        {
          year: 2025,
          quarter: 2,
          objective: '具体的なアクションを開始する',
          keyResults: [
            { description: '第一段階の目標を達成する', targetValue: 25, currentValue: 0 },
          ],
        },
      ],
    };

    let okrPlan: OKRPlan = mockOkrPlan;

    // Validate response structure
    if (!okrPlan.yearly || !okrPlan.quarterly) {
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