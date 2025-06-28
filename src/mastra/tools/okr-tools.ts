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
  execute: async ({ context, runtimeContext }) => {
    const { goalTitle, goalDescription, goalDueDate, chatInsights } = context;

    // Import AI generation tool and date utilities
    const { generateAIOKRTool } = await import('./ai-okr-generation-tool');
    const { calculatePeriod } = await import('../../../lib/date-utils');

    // Calculate period using month-based calculation
    const period = calculatePeriod(new Date(), new Date(goalDueDate));

    // Prepare AI generation request
    const aiRequest = {
      goalTitle,
      goalDescription: goalDescription || '',
      totalPeriod: {
        months: period.totalMonths,
        years: period.totalYears,
      },
      yearlyBreakdown: period.yearlyBreakdown,
      chatInsights: {
        motivation: chatInsights?.motivation || '',
        currentSkills: '', // TODO: Extract from chat history
        availableResources: chatInsights?.resources || '',
        constraints: chatInsights?.obstacles || '',
        values: '', // TODO: Extract from chat history
      },
    };

    try {
      console.log('🔍 DEBUG: AI期間計算結果:', period);
      console.log('🔍 DEBUG: yearlyBreakdown:', period.yearlyBreakdown);
      
      // Generate AI-powered OKRs
      const aiResult = await generateAIOKRTool.execute({
        context: aiRequest,
        runtimeContext,
      });
      
      console.log('🔍 DEBUG: AI生成成功:', aiResult);
      
      // AI生成結果の年重複チェック
      const aiYears = aiResult.yearlyOKRs.map(okr => okr.year);
      const aiUniqueYears = new Set(aiYears);
      if (aiYears.length !== aiUniqueYears.size) {
        console.warn('⚠️ AI生成結果に年の重複が検出されました:', aiYears);
        console.warn('重複した年:', aiYears.filter((year, index) => aiYears.indexOf(year) !== index));
        throw new Error('AI生成結果に年の重複があるため、フォールバックに切り替えます');
      }

      // Convert AI result to legacy format for backward compatibility
      const yearlyOKRs = aiResult.yearlyOKRs.map(yearly => ({
        year: yearly.year,
        objective: yearly.objective,
        keyResults: yearly.keyResults.map(kr => ({
          description: kr.description,
          targetValue: kr.targetValue,
          currentValue: kr.baselineValue || 0,
        })),
        // Extended properties for new system
        rationale: yearly.rationale,
        monthsInYear: yearly.monthsInYear,
        startMonth: yearly.startMonth,
        endMonth: yearly.endMonth,
        isPartialYear: yearly.isPartialYear,
        dependencies: yearly.dependencies,
        riskFactors: yearly.riskFactors,
        keyMilestones: yearly.keyMilestones,
      }));

      // Generate quarterly OKRs from AI yearly data  
      const quarterlyOKRs = [];
      console.log('🔍 DEBUG: 四半期OKR生成開始 - yearly OKRs数:', aiResult.yearlyOKRs.length);
      
      for (const yearly of aiResult.yearlyOKRs) {
        console.log('🔍 DEBUG: 四半期OKR生成中 - 年:', yearly.year);
        // Generate 4 quarters for each year (simplified for now)
        const milestonesPerQuarter = Math.ceil(yearly.keyMilestones.length / 4);
        
        for (let quarter = 1; quarter <= 4; quarter++) {
          const quarterMilestones = yearly.keyMilestones.slice(
            (quarter - 1) * milestonesPerQuarter,
            quarter * milestonesPerQuarter
          );
          
          if (quarterMilestones.length > 0) {
            quarterlyOKRs.push({
              year: yearly.year,
              quarter,
              objective: `Q${quarter}: ${quarterMilestones.map(m => m.milestone).join(', ')}`,
              keyResults: [{
                description: `Q${quarter}のマイルストーンを達成する`,
                targetValue: 100,
                currentValue: 0,
              }],
            });
          }
        }
      }
      
      // 四半期OKRの重複チェック
      const quarterlyYearQuarters = quarterlyOKRs.map(q => `${q.year}-Q${q.quarter}`);
      const uniqueQuarterlyYearQuarters = new Set(quarterlyYearQuarters);
      if (quarterlyYearQuarters.length !== uniqueQuarterlyYearQuarters.size) {
        console.warn('⚠️ 四半期OKRに重複が検出されました:', quarterlyYearQuarters);
      }

      console.log('🔍 DEBUG: 最終的な yearly OKRs年一覧:', yearlyOKRs.map(y => y.year));
      console.log('🔍 DEBUG: 最終的な quarterly OKRs年一覧:', quarterlyOKRs.map(q => `${q.year}-Q${q.quarter}`));

      return {
        yearly: yearlyOKRs,
        quarterly: quarterlyOKRs,
        // Include AI metadata for debugging/logging
        aiMetadata: {
          overallStrategy: aiResult.overallStrategy,
          successCriteria: aiResult.successCriteria,
          totalEstimatedEffort: aiResult.totalEstimatedEffort,
          keySuccessFactors: aiResult.keySuccessFactors,
        },
      };

    } catch (error) {
      console.error('❌ AI OKR generation failed, falling back to simple generation:', error);
      console.log('🔍 DEBUG: フォールバック実行 - period.yearlyBreakdown:', period.yearlyBreakdown);
      
      // フォールバック用の年重複チェック
      const fallbackYears = period.yearlyBreakdown.map(y => y.year);
      const fallbackUniqueYears = new Set(fallbackYears);
      if (fallbackYears.length !== fallbackUniqueYears.size) {
        console.error('🚨 期間計算でも年の重複が発生:', fallbackYears);
        // 重複を除去
        const uniqueBreakdown = period.yearlyBreakdown.filter(
          (item, index, arr) => arr.findIndex(x => x.year === item.year) === index
        );
        console.log('🔧 重複除去後:', uniqueBreakdown.map(x => x.year));
        period.yearlyBreakdown = uniqueBreakdown;
      }
      
      // Fallback to simplified month-based generation
      const dueDate = new Date(goalDueDate);
      const currentDate = new Date();
      
      const yearlyOKRs = period.yearlyBreakdown.map(yearInfo => ({
        year: yearInfo.year,
        objective: yearInfo.isPartialYear 
          ? `${goalTitle}の段階的実行（${yearInfo.monthsInYear}ヶ月間）`
          : `${goalTitle}の年次目標達成`,
        keyResults: [
          {
            description: `${yearInfo.monthsInYear}ヶ月間での具体的成果を達成する`,
            targetValue: 100,
            currentValue: 0,
          },
        ],
        // Add extended properties even in fallback
        rationale: 'AI生成に失敗したため簡易生成を使用',
        monthsInYear: yearInfo.monthsInYear,
        startMonth: yearInfo.startMonth,
        endMonth: yearInfo.endMonth,
        isPartialYear: yearInfo.isPartialYear,
        dependencies: [],
        riskFactors: ['AI生成機能の不具合'],
        keyMilestones: [],
      }));

      return {
        yearly: yearlyOKRs,
        quarterly: [], // Empty quarterly for fallback
      };
    }
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
