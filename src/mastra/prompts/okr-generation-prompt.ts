import type { AIOKRGenerationRequest } from '../schemas/okr-schemas';

/**
 * Create comprehensive OKR generation prompt for AI
 */
export function createOKRGenerationPrompt(
  request: AIOKRGenerationRequest,
): string {
  return `
あなたはOKR（Objectives and Key Results）の専門家です。
以下の情報を基に、各年の具体的で実現可能なOKRを生成してください。

【目標情報】
- タイトル: ${request.goalTitle}
- 説明: ${request.goalDescription}
- 期間: ${request.totalPeriod.years}年（${request.totalPeriod.months}ヶ月）

【年次詳細】
${request.yearlyBreakdown
  .map(
    (y) =>
      `- ${y.year}年: ${y.monthsInYear}ヶ月${y.isPartialYear ? `（${y.startMonth}月-${y.endMonth}月）` : ''}`,
  )
  .join('\n')}

【ユーザーインサイト】
- 動機: ${request.chatInsights.motivation}
- 現在のスキル: ${request.chatInsights.currentSkills}
- 利用可能なリソース: ${request.chatInsights.availableResources}
- 制約: ${request.chatInsights.constraints}
- 価値観: ${request.chatInsights.values}

【生成ルール】
1. 各年のObjectiveは具体的で、その年の特性を反映させる
2. 部分年の場合は、利用可能な月数に応じて現実的な目標を設定
3. Key Resultsは測定可能で、具体的な数値目標を含める
4. 年次間の連続性と段階的な成長を考慮
5. ユーザーの動機や価値観を反映させる
6. 各年に3-5個のKey Resultsを設定
7. リスク要因と対策を考慮する
8. 月次マイルストーンを設定
9. targetValueは99,999,999以下の数値に制限する（データベース制約のため）
10. 【重要】frequencyフィールドには必ず以下の値のみ使用: "daily", "weekly", "monthly", "quarterly", "annually", "once"
11. 【重要】Objectiveには「2025年:」「Q1:」などの時期表記を含めない。内容のみを記載する

【出力形式】
以下のJSON形式で回答してください：

{
  "yearlyOKRs": [
    {
      "year": 2025,
      "monthsInYear": 12,
      "startMonth": 1,
      "endMonth": 12,
      "isPartialYear": false,
      "objective": "具体的で測定可能な年次目標（時期は含めず、内容のみ記載）",
      "rationale": "なぜこの目標を設定するのかの理由",
      "keyMilestones": [
        {
          "month": 3,
          "milestone": "第1四半期の重要なマイルストーン"
        }
      ],
      "keyResults": [
        {
          "description": "測定可能な成果指標",
          "targetValue": 100,
          "unit": "個",
          "measurementMethod": "具体的な測定方法",
          "frequency": "monthly",
          "baselineValue": 0
        },
        {
          "description": "年次評価指標",
          "targetValue": 1,
          "unit": "回",
          "measurementMethod": "年度末評価",
          "frequency": "annually",
          "baselineValue": 0
        }
      ],
      "dependencies": ["必要な前提条件"],
      "riskFactors": ["想定されるリスク要因"]
    }
  ],
  "overallStrategy": "全体的な戦略と approach",
  "successCriteria": "成功の判断基準",
  "totalEstimatedEffort": "推定総工数（週時間×月数等）",
  "keySuccessFactors": ["成功のための重要要因"]
}

重要: 必ず有効なJSONを返してください。文字列内の改行は\\nでエスケープしてください。
`;
}

/**
 * Create validation prompt for generated OKR
 */
export function createOKRValidationPrompt(generatedOKR: object): string {
  return `
以下のOKRプランを評価し、改善点があれば指摘してください：

${JSON.stringify(generatedOKR, null, 2)}

【重要制約】
- 改善版を提案する場合、同じ年（year）に複数のObjectiveを作成しないでください
- 各年は必ず1つのObjectiveのみとしてください
- より詳細にしたい場合は、Key Resultsを充実させてください
- 年の重複は絶対に避けてください

評価観点：
1. 目標の具体性と測定可能性
2. 年次間の連続性と段階的成長
3. 現実的な達成可能性
4. リスク分析の妥当性
5. マイルストーンの適切性
6. 年の一意性（重複なし）

改善が必要な場合は修正されたOKRを同じJSON形式で返してください。
問題がない場合は "APPROVED" と返してください。
`;
}
