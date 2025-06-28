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
      'details',
      'context',
    ]),
    depth: z.number(),
  }),
  execute: async ({ context }) => {
    const { goalTitle, chatHistory, currentDepth } = context;

    // 前回の回答を分析して、より文脈に沿った質問を生成
    const lastUserMessage = chatHistory
      .filter(msg => msg.role === 'user')
      .pop()?.content || '';

    // 質問タイプの決定（より柔軟に）
    const questionTypes = [
      'motivation',
      'experience', 
      'resources',
      'timeline',
      'obstacles',
      'values',
      'details',
      'context'
    ] as const;

    // 深度に基づく基本的な質問選択
    let type: typeof questionTypes[number];
    let question: string;

    if (currentDepth === 0) {
      type = 'motivation';
      question = `なぜ「${goalTitle}」を達成したいのですか？この目標があなたにとって重要な理由を教えてください。`;
    } else if (currentDepth === 1) {
      type = 'experience';
      question = `「${goalTitle}」に関連して、これまでにどのような経験や取り組みをされたことがありますか？`;
    } else {
      // より高い深度では、前回の回答に基づいて動的に質問を選択
      if (lastUserMessage.toLowerCase().includes('時間') || lastUserMessage.toLowerCase().includes('期限')) {
        type = 'timeline';
        question = `具体的なスケジュールについて、もう少し詳しく教えてください。どのようなペースで進めていきたいですか？`;
      } else if (lastUserMessage.toLowerCase().includes('経験') || lastUserMessage.toLowerCase().includes('やった')) {
        type = 'details';
        question = `その経験から学んだことや、今回活かせそうなポイントはありますか？`;
      } else if (lastUserMessage.toLowerCase().includes('困難') || lastUserMessage.toLowerCase().includes('難しい')) {
        type = 'obstacles';
        question = `その困難を乗り越えるために、どのような準備や対策が必要だと思いますか？`;
      } else if (lastUserMessage.toLowerCase().includes('お金') || lastUserMessage.toLowerCase().includes('資金')) {
        type = 'resources';
        question = `予算以外にも、時間やスキル面でのリソースはいかがでしょうか？`;
      } else {
        // デフォルトの質問パターン
        const fallbackQuestions = [
          { type: 'context' as const, question: `「${goalTitle}」を達成した後、あなたの生活はどのように変わると思いますか？` },
          { type: 'values' as const, question: `この目標は、あなたの価値観や人生観とどのように関連していますか？` },
          { type: 'obstacles' as const, question: `目標達成の過程で、最も大きな課題になりそうなことは何ですか？` },
          { type: 'resources' as const, question: `目標達成のために、新たに身につけたいスキルや知識はありますか？` }
        ];
        const randomIndex = currentDepth % fallbackQuestions.length;
        const selected = fallbackQuestions[randomIndex];
        type = selected.type;
        question = selected.question;
      }
    }

    return {
      question,
      type,
      depth: currentDepth + 1,
    };
  },
});
