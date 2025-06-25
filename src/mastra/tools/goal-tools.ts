import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const goalAnalysisTool = createTool({
  id: 'analyze-goal',
  description: 'ユーザーの目標を分析し、深掘り質問を生成する',
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
    currentDepth: z.number(),
    maxDepth: z.number(),
    isComplete: z.boolean(),
    completionPercentage: z.number(),
    missingAspects: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { goalId, userId, chatHistory } = context;

    // 目標データの取得
    const goalResult = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .limit(1);

    if (goalResult.length === 0) {
      throw new Error('Goal not found');
    }

    // 対話の深さを分析
    const depth = Math.min(chatHistory.length, 5);
    const isComplete = depth >= 5;
    const completionPercentage = Math.min((depth / 5) * 100, 100);

    const missingAspects = [];
    if (depth < 2) missingAspects.push('具体的な理由や背景');
    if (depth < 3) missingAspects.push('経験や能力の把握');
    if (depth < 4) missingAspects.push('障害や課題の特定');
    if (depth < 5) missingAspects.push('行動計画の詳細化');

    return {
      currentDepth: depth,
      maxDepth: 5,
      isComplete,
      completionPercentage,
      missingAspects,
    };
  },
});

export const generateQuestionTool = createTool({
  id: 'generate-question',
  description: '目標達成のための次の質問を生成する',
  inputSchema: z.object({
    goalTitle: z.string(),
    goalDescription: z.string().optional(),
    goalDueDate: z.string().optional(),
    chatHistory: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    ),
    currentDepth: z.number(),
  }),
  outputSchema: z.object({
    question: z.string(),
    type: z.enum([
      'motivation',
      'experience',
      'resources',
      'timeline',
      'obstacles',
      'values',
    ]),
    depth: z.number(),
  }),
  execute: async ({ context }) => {
    const { goalTitle, chatHistory, currentDepth } = context;

    // 質問タイプの決定
    const questionTypes = [
      'motivation',
      'experience',
      'resources',
      'timeline',
      'obstacles',
      'values',
    ] as const;
    const typeIndex = Math.min(currentDepth, questionTypes.length - 1);
    const type = questionTypes[typeIndex];

    // 質問の生成（実際にはAIモデルを使用してより適切な質問を生成する）
    const questions = {
      motivation: `なぜ「${goalTitle}」を達成したいのですか？この目標があなたにとって重要な理由を教えてください。`,
      experience: `「${goalTitle}」に関連して、これまでにどのような経験がありますか？`,
      resources: `「${goalTitle}」を達成するために必要なリソース（時間、スキル、資金など）はありますか？`,
      timeline: `いつまでに「${goalTitle}」を達成したいですか？具体的なスケジュールを教えてください。`,
      obstacles: `「${goalTitle}」を達成する上で、どのような課題や障害が予想されますか？`,
      values: `「${goalTitle}」は、あなたの価値観やライフスタイルとどのように関連していますか？`,
    };

    return {
      question: questions[type],
      type,
      depth: currentDepth + 1,
    };
  },
});
