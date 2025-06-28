import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { vertex } from '@ai-sdk/google-vertex';
import { generateText, generateObject } from 'ai';

export const goalAnalysisTool = createTool({
  id: 'analyze-goal',
  description:
    'AI駆動の動的対話分析 - 固定的な深度制限ではなく情報の質と充実度で評価',
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
    // レガシー対応（既存テストのため）
    currentDepth: z.number(),
    maxDepth: z.number(),
    isComplete: z.boolean(),
    completionPercentage: z.number(),
    missingAspects: z.array(z.string()),
    // 新しいAI駆動評価項目
    informationSufficiency: z.number(),
    isReadyToProceed: z.boolean(),
    missingCriticalInfo: z.array(z.string()),
    conversationQuality: z.enum(['low', 'medium', 'high']),
    suggestedNextAction: z.enum([
      'continue_conversation',
      'proceed_to_planning',
      'clarify_goal',
    ]),
    reasoning: z.string(),
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

    const goal = goalResult[0];

    try {
      // 構造化出力用のZodスキーマ
      const analysisSchema = z.object({
        motivation_clarity: z.number().min(0).max(1).describe('動機の明確性'),
        experience_background: z
          .number()
          .min(0)
          .max(1)
          .describe('経験・背景の把握'),
        available_resources: z
          .number()
          .min(0)
          .max(1)
          .describe('リソースの理解'),
        expected_obstacles: z.number().min(0).max(1).describe('障害の認識'),
        values_priorities: z.number().min(0).max(1).describe('価値観の把握'),
        goal_specificity: z.number().min(0).max(1).describe('目標の具体性'),
        information_sufficiency: z
          .number()
          .min(0)
          .max(1)
          .describe('総合的な情報充実度'),
        conversation_quality: z
          .enum(['low', 'medium', 'high'])
          .describe('対話の質'),
        suggested_next_action: z
          .enum([
            'continue_conversation',
            'proceed_to_planning',
            'clarify_goal',
          ])
          .describe('次のアクション'),
        reasoning: z.string().describe('判断理由'),
        missing_critical_info: z
          .array(z.string())
          .describe('不足している重要情報'),
        is_ready_to_proceed: z
          .boolean()
          .describe('計画生成に進む準備ができているか'),
      });

      // 完全AI駆動の対話分析
      const conversationText = chatHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      const prompt = `あなたは目標達成支援の専門家です。以下の目標と対話履歴を分析し、情報の充実度と次のアクションを判断してください。

目標: "${goal.title}"
目標詳細: "${goal.description || '詳細なし'}"
達成期限: "${goal.dueDate}"

対話履歴:
${conversationText}

以下の観点で分析してください：
1. 動機・理由の明確性 (0-1)
2. 関連経験・背景の把握 (0-1) 
3. 利用可能リソースの理解 (0-1)
4. 予想される障害の認識 (0-1)
5. 価値観・優先順位の把握 (0-1)
6. 目標の具体性・実現可能性 (0-1)

総合的な情報充実度、対話の質、次のアクション、判断理由を適切に評価してください。`;

      const result = await generateObject({
        model: vertex('gemini-2.0-flash-001'),
        prompt,
        schema: analysisSchema,
        temperature: 0.3,
      });

      console.log(
        '✅ Analysis structured output generated successfully:',
        result.object,
      );
      const analysisData = result.object;

      // レガシー形式対応
      const depth = Math.min(chatHistory.length, 5);
      const isComplete = analysisData.information_sufficiency >= 0.8;
      const completionPercentage = Math.min(
        analysisData.information_sufficiency * 100,
        100,
      );

      return {
        // レガシー対応
        currentDepth: depth,
        maxDepth: 5,
        isComplete,
        completionPercentage,
        missingAspects: analysisData.missing_critical_info || [],
        // 新しいAI駆動評価
        informationSufficiency: analysisData.information_sufficiency,
        isReadyToProceed: analysisData.is_ready_to_proceed,
        missingCriticalInfo: analysisData.missing_critical_info || [],
        conversationQuality: analysisData.conversation_quality,
        suggestedNextAction: analysisData.suggested_next_action,
        reasoning: analysisData.reasoning,
      };
    } catch (error) {
      console.error('❌ AI analysis failed:', error);

      // フォールバック: 基本的な分析
      const depth = Math.min(chatHistory.length, 5);
      const informationSufficiency = Math.min(chatHistory.length * 0.15, 0.9);

      return {
        currentDepth: depth,
        maxDepth: 5,
        isComplete: false,
        completionPercentage: informationSufficiency * 100,
        missingAspects: ['AI分析に失敗したため、基本的な評価を実行'],
        informationSufficiency,
        isReadyToProceed: false,
        missingCriticalInfo: ['AI分析に失敗'],
        conversationQuality: 'medium' as const,
        suggestedNextAction: 'continue_conversation' as const,
        reasoning: 'AI分析に失敗したため、基本的な評価を提供しています',
      };
    }
  },
});

export const generateQuestionTool = createTool({
  id: 'generate-question',
  description:
    'AI駆動動的質問生成 - 会話の文脈と情報の充実度に基づく適応的質問',
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
    // レガシー対応
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
    // 新しいAI駆動項目
    reasoning: z.string(),
    shouldComplete: z.boolean(),
    confidence: z.number(),
  }),
  execute: async ({ context }) => {
    const { goalTitle, chatHistory, currentDepth } = context;

    try {
      // 完全AI駆動の質問生成
      const previousQuestions = chatHistory
        .filter((msg) => msg.role === 'ai' || msg.role === 'assistant')
        .map((msg) => msg.content);

      console.log('🔍 Question generation inputs:');
      console.log('- Goal title:', goalTitle);
      console.log('- Chat history length:', chatHistory.length);
      console.log('- Previous questions count:', previousQuestions.length);
      console.log('- Current depth:', currentDepth);

      // 構造化出力用のZodスキーマ
      const questionSchema = z.object({
        question: z.string().describe('ユーザーに対する次の質問'),
        type: z
          .enum([
            'motivation',
            'experience',
            'resources',
            'timeline',
            'obstacles',
            'values',
            'details',
            'context',
          ])
          .describe('質問のタイプ'),
        reasoning: z.string().describe('なぜこの質問をするのかの理由'),
        confidence: z.number().min(0).max(1).describe('質問の適切性への信頼度'),
        should_complete: z.boolean().describe('対話を完了すべきかどうか'),
      });

      // シンプルなプロンプトで構造化出力
      const prompt = `あなたは目標達成支援コーチです。以下の情報をもとに、次の質問を生成してください。

目標: "${goalTitle}"
対話数: ${chatHistory.length}
過去の質問数: ${previousQuestions.length}

${chatHistory.length === 0 ? '初回の質問では、まず動機や理由について聞いてください。' : ''}
${chatHistory.length === 1 ? '2回目の質問では、関連する経験や背景について聞いてください。' : ''}
${chatHistory.length >= 2 ? 'これまでの対話を踏まえ、リソースや障害について深掘りしてください。' : ''}`;

      console.log('🔍 Generated prompt length:', prompt.length);

      const result = await generateObject({
        model: vertex('gemini-2.0-flash-001'),
        prompt,
        schema: questionSchema,
        temperature: 0.3,
      });

      console.log(
        '✅ Structured output generated successfully:',
        result.object,
      );
      const questionData = result.object;

      console.log('🤖 AI-generated question:', questionData);

      return {
        // レガシー対応
        question: questionData.question,
        type: questionData.type,
        depth: currentDepth + 1,
        // 新しいAI駆動項目
        reasoning: questionData.reasoning,
        shouldComplete: questionData.should_complete || false,
        confidence: questionData.confidence || 0.7,
      };
    } catch (error) {
      console.error('❌ AI question generation failed:', error);
      console.log('🔄 Using enhanced fallback strategy...');

      // 強化されたフォールバック: 会話の深度に応じた質問
      const generateFallbackQuestion = () => {
        // 初回: 動機を聞く
        if (currentDepth === 0) {
          return {
            question: `なぜ「${goalTitle}」を達成したいのですか？あなたにとってどのような意味がありますか？`,
            type: 'motivation' as const,
            reasoning: '初回の質問で動機を探るフォールバック',
          };
        }
        // 2回目: 経験を聞く
        if (currentDepth === 1) {
          return {
            question: `「${goalTitle}」に関連して、これまでにどのような経験や取り組みをされたことがありますか？`,
            type: 'experience' as const,
            reasoning: '2回目の質問で経験を探るフォールバック',
          };
        }
        // 3回目以降: リソースや障害を聞く
        if (currentDepth >= 2) {
          const questions = [
            {
              question: `「${goalTitle}」を達成するために、現在利用できるリソース（時間、資金、スキルなど）はありますか？`,
              type: 'resources' as const,
              reasoning: 'リソース確認のフォールバック',
            },
            {
              question: `「${goalTitle}」を達成する過程で、最も大きな障害や困難になりそうなことは何ですか？`,
              type: 'obstacles' as const,
              reasoning: '障害確認のフォールバック',
            },
          ];
          return questions[(currentDepth - 2) % questions.length];
        }

        // デフォルト
        return {
          question: `「${goalTitle}」について、もう少し詳しく教えてください。`,
          type: 'details' as const,
          reasoning: 'デフォルトフォールバック',
        };
      };

      const fallback = generateFallbackQuestion();
      console.log('🔄 Fallback question generated:', fallback.question);

      return {
        question: fallback.question,
        type: fallback.type,
        depth: currentDepth + 1,
        reasoning: fallback.reasoning,
        shouldComplete: false,
        confidence: 0.6,
      };
    }
  },
});
