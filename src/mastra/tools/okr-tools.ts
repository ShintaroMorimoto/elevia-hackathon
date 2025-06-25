import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const keyResultSchema = z.object({
  description: z.string(),
  targetValue: z.number(),
  currentValue: z.number(),
});

const yearlyOKRSchema = z.object({
  year: z.number(),
  objective: z.string(),
  keyResults: z.array(keyResultSchema),
});

const quarterlyOKRSchema = z.object({
  year: z.number(),
  quarter: z.number(),
  objective: z.string(),
  keyResults: z.array(keyResultSchema),
});

export const generateOKRTool = createTool({
  id: 'generate-okr',
  description: '目標に基づいてOKRプランを生成する',
  inputSchema: z.object({
    goalTitle: z.string(),
    goalDescription: z.string(),
    goalDueDate: z.string(),
    chatInsights: z.object({
      motivation: z.string().optional(),
      resources: z.string().optional(),
      obstacles: z.string().optional(),
    }),
  }),
  outputSchema: z.object({
    yearly: z.array(yearlyOKRSchema),
    quarterly: z.array(quarterlyOKRSchema),
  }),
  execute: async ({ context }) => {
    const { goalTitle, goalDescription, goalDueDate, chatInsights } = context;

    // 目標期限から年次・四半期のプランを計算
    const dueDate = new Date(goalDueDate);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const dueYear = dueDate.getFullYear();

    // 年次OKRの生成
    const yearlyOKRs = [];
    for (let year = currentYear; year <= dueYear; year++) {
      const isFirstYear = year === currentYear;
      const isLastYear = year === dueYear;

      yearlyOKRs.push({
        year,
        objective: isFirstYear
          ? `${goalTitle}の基盤を構築する`
          : isLastYear
            ? `${goalTitle}を完全に達成する`
            : `${goalTitle}の実行段階を進める`,
        keyResults: [
          {
            description: isFirstYear
              ? '必要なスキルと知識を習得する'
              : '目標の主要な部分を達成する',
            targetValue: 100,
            currentValue: 0,
          },
          {
            description: isFirstYear
              ? '具体的な行動計画を策定する'
              : '必要なリソースを最適化する',
            targetValue: 100,
            currentValue: 0,
          },
        ],
      });
    }

    // 四半期OKRの生成（現在の年のみ）
    const quarterlyOKRs = [];
    const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;

    for (let quarter = currentQuarter; quarter <= 4; quarter++) {
      const progress =
        ((quarter - currentQuarter + 1) / (5 - currentQuarter)) * 100;

      quarterlyOKRs.push({
        year: currentYear,
        quarter,
        objective:
          quarter === currentQuarter
            ? '目標達成のための準備を開始する'
            : `目標の${Math.floor(progress)}%を達成する`,
        keyResults: [
          {
            description:
              quarter === currentQuarter
                ? '情報収集と計画策定を完了する'
                : `第${quarter}四半期の目標を達成する`,
            targetValue: Math.floor(progress),
            currentValue: 0,
          },
        ],
      });
    }

    return {
      yearly: yearlyOKRs,
      quarterly: quarterlyOKRs,
    };
  },
});

export const analyzeChatHistoryTool = createTool({
  id: 'analyze-chat-history',
  description: '対話履歴から重要な洞察を抽出する',
  inputSchema: z.object({
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
    readinessLevel: z.number().min(1).max(10),
    recommendedActions: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { chatHistory } = context;

    // 対話履歴の分析（実際にはより高度な分析を行う）
    const userMessages = chatHistory
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content);

    const hasMotivation = userMessages.some(
      (msg) =>
        msg.includes('したい') ||
        msg.includes('なりたい') ||
        msg.includes('目指す'),
    );

    const hasSpecificPlan = userMessages.some(
      (msg) =>
        msg.includes('計画') ||
        msg.includes('スケジュール') ||
        msg.includes('期限'),
    );

    const readinessLevel =
      hasMotivation && hasSpecificPlan ? 7 : hasMotivation ? 5 : 3;

    return {
      userMotivation: '目標を通じて成長したい',
      keyInsights: [
        '明確な目標意識がある',
        '計画的にアプローチしようとしている',
        '必要なリソースを理解している',
      ],
      readinessLevel,
      recommendedActions: [
        '具体的なスケジュールを立てる',
        '必要なスキルを習得する',
        '進捗を定期的に確認する',
        'メンターや支援者を見つける',
      ],
    };
  },
});
