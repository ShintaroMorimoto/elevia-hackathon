import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { vertex } from '@ai-sdk/google-vertex';
import { generateObject } from 'ai';

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

      const userAnswers = chatHistory
        .filter((msg) => msg.role === 'user')
        .map((msg) => msg.content);

      // 重複検出：過去の質問タイプを分析
      const previousQuestionTypes = new Set<string>();
      const recentQuestionTypes = new Set<string>();
      
      // 最近の質問のタイプを推定（簡易的な方法）
      previousQuestions.forEach((question, index) => {
        if (question.includes('なぜ') || question.includes('動機') || question.includes('理由')) {
          previousQuestionTypes.add('motivation');
          if (index >= previousQuestions.length - 2) recentQuestionTypes.add('motivation');
        }
        if (question.includes('経験') || question.includes('これまで') || question.includes('過去')) {
          previousQuestionTypes.add('experience');
          if (index >= previousQuestions.length - 2) recentQuestionTypes.add('experience');
        }
        if (question.includes('リソース') || question.includes('資金') || question.includes('スキル') || question.includes('人脈')) {
          previousQuestionTypes.add('resources');
          if (index >= previousQuestions.length - 2) recentQuestionTypes.add('resources');
        }
        if (question.includes('障害') || question.includes('困難') || question.includes('課題')) {
          previousQuestionTypes.add('obstacles');
          if (index >= previousQuestions.length - 2) recentQuestionTypes.add('obstacles');
        }
      });

      console.log('🔍 Question generation inputs:');
      console.log('- Goal title:', goalTitle);
      console.log('- Chat history length:', chatHistory.length);
      console.log('- Previous questions count:', previousQuestions.length);
      console.log('- Previous question types:', Array.from(previousQuestionTypes));
      console.log('- Recent question types:', Array.from(recentQuestionTypes));
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

      // 対話履歴を含むプロンプト
      const conversationContext = chatHistory.length > 0 
        ? `\n\n過去の対話履歴:\n${chatHistory.map((msg, i) => `${i + 1}. ${msg.role}: ${msg.content}`).join('\n')}`
        : '';

      // 重複回避の指示
      const avoidanceGuidance = previousQuestionTypes.size > 0
        ? `\n\n重複回避:\n- 既に聞いたタイプ: ${Array.from(previousQuestionTypes).join(', ')}\n- 最近聞いたタイプ: ${Array.from(recentQuestionTypes).join(', ')}\n- 上記と異なる角度や詳細から質問してください`
        : '';

      // ユーザー回答の要約
      const userResponsesSummary = userAnswers.length > 0
        ? `\n\nユーザーの回答概要:\n${userAnswers.map((answer, i) => `回答${i + 1}: ${answer.slice(0, 100)}${answer.length > 100 ? '...' : ''}`).join('\n')}`
        : '';

      const prompt = `あなたは目標達成支援コーチです。以下の情報をもとに、効果的なOKR作成のための次の質問を生成してください。

目標: "${goalTitle}"
対話数: ${chatHistory.length}${conversationContext}${avoidanceGuidance}${userResponsesSummary}

重要な原則:
1. 過去の質問と重複しないようにする
2. ユーザーの回答内容を踏まえて、不足している情報を特定する
3. 以下の8つの観点をバランスよく探る：
   - motivation: なぜその目標を達成したいのか
   - experience: 関連する過去の経験
   - resources: 利用可能なリソース（時間、お金、スキル、人脈）
   - timeline: 具体的なスケジュールと期限
   - obstacles: 予想される困難や障害
   - values: 価値観と優先順位
   - details: 目標の具体的な詳細
   - context: 現在の状況や環境

**質問生成の指針:**
- ふわっとした理想しか持たないユーザーでも答えやすいよう、具体例や選択肢を含める
- 質問文の中に「例えば、○○、△△、××など」といった形で3-4個の具体例を提示する
- オープンな質問にせず、選択肢を示しながらも自由回答も可能な形式にする
- 「どのような」ではなく「以下のうちどれに近いですか」のような聞き方を心がける

同じタイプの質問を繰り返さず、ユーザーの回答から得られた情報を活用して、より深い洞察を得るための質問を生成してください。特に最近聞いたタイプは避けて、新しい角度から質問してください。`;

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

      // 過去の質問タイプを再取得（フォールバック内でも重複回避）
      const previousQuestions = chatHistory
        .filter((msg) => msg.role === 'ai' || msg.role === 'assistant')
        .map((msg) => msg.content);

      const askedTypes = new Set<string>();
      previousQuestions.forEach((question) => {
        if (question.includes('なぜ') || question.includes('動機') || question.includes('理由')) {
          askedTypes.add('motivation');
        }
        if (question.includes('経験') || question.includes('これまで') || question.includes('過去')) {
          askedTypes.add('experience');
        }
        if (question.includes('リソース') || question.includes('資金') || question.includes('スキル')) {
          askedTypes.add('resources');
        }
        if (question.includes('障害') || question.includes('困難') || question.includes('課題')) {
          askedTypes.add('obstacles');
        }
        if (question.includes('いつ') || question.includes('期限') || question.includes('スケジュール')) {
          askedTypes.add('timeline');
        }
        if (question.includes('価値観') || question.includes('優先') || question.includes('大切')) {
          askedTypes.add('values');
        }
      });

      // 強化されたフォールバック: 未使用タイプを優先
      const generateFallbackQuestion = (): {
        question: string;
        type: 'motivation' | 'experience' | 'resources' | 'timeline' | 'obstacles' | 'values' | 'details' | 'context';
        reasoning: string;
      } => {
        const questionOptions: Array<{
          type: 'motivation' | 'experience' | 'resources' | 'timeline' | 'obstacles' | 'values' | 'details' | 'context';
          question: string;
          reasoning: string;
        }> = [
          {
            type: 'motivation',
            question: `なぜ「${goalTitle}」を達成したいのですか？あなたにとってどのような意味がありますか？`,
            reasoning: '動機を探るフォールバック',
          },
          {
            type: 'experience',
            question: `「${goalTitle}」に関連して、これまでにどのような経験や取り組みをされたことがありますか？`,
            reasoning: '経験を探るフォールバック',
          },
          {
            type: 'resources',
            question: `「${goalTitle}」を達成するために、現在利用できるリソース（時間、資金、スキルなど）はありますか？`,
            reasoning: 'リソース確認のフォールバック',
          },
          {
            type: 'timeline',
            question: `「${goalTitle}」を達成するために、どのようなスケジュールを考えていますか？`,
            reasoning: 'タイムライン確認のフォールバック',
          },
          {
            type: 'obstacles',
            question: `「${goalTitle}」を達成する過程で、最も大きな障害や困難になりそうなことは何ですか？`,
            reasoning: '障害確認のフォールバック',
          },
          {
            type: 'values',
            question: `「${goalTitle}」を達成する上で、あなたにとって最も大切にしたい価値観は何ですか？`,
            reasoning: '価値観確認のフォールバック',
          },
          {
            type: 'context',
            question: `「${goalTitle}」を目指すようになった現在の状況や環境について教えてください。`,
            reasoning: '状況確認のフォールバック',
          },
          {
            type: 'details',
            question: `「${goalTitle}」について、もう少し詳しく教えてください。`,
            reasoning: '詳細確認のフォールバック',
          },
        ];

        // 未使用のタイプを優先
        const unusedOptions = questionOptions.filter(option => !askedTypes.has(option.type));
        
        if (unusedOptions.length > 0) {
          // 未使用のタイプからランダムに選択
          const selected = unusedOptions[Math.floor(Math.random() * unusedOptions.length)];
          console.log(`🔄 Selected unused type: ${selected.type}`);
          return {
            question: selected.question,
            type: selected.type,
            reasoning: selected.reasoning,
          };
        }

        // すべて使用済みの場合は、深度に応じて選択
        const fallbackIndex = currentDepth % questionOptions.length;
        const selected = questionOptions[fallbackIndex];
        console.log(`🔄 All types used, selecting by depth: ${selected.type}`);
        return {
          question: selected.question,
          type: selected.type,
          reasoning: `${selected.reasoning}（全タイプ使用済み、深度${currentDepth}による選択）`,
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
