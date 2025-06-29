# OKR品質スコア実装アイデア

## 概要
AI生成OKRの品質を定量化・管理するためのアプローチ案

## 品質評価の構成要素

### 1. OKRの原則に基づく評価軸

```typescript
interface OKRQualityMetrics {
  // Objective（目標）の品質評価
  objectiveClarity: number;     // 0-100: 曖昧さのなさ
  objectiveAmbition: number;    // 0-100: 野心度（高すぎず低すぎず）
  objectiveRealism: number;     // 0-100: 現実性
  objectiveTimebound: number;   // 0-100: 期限の明確さ
  
  // Key Results（成果指標）の品質評価
  keyResultQuantifiable: number; // 0-100: 定量性
  keyResultRelevance: number;    // 0-100: 目標との関連性
  keyResultOutcome: number;      // 0-100: 活動でなく成果か
  keyResultFeasibility: number;  // 0-100: 実現可能性
  
  // 全体スコア
  overallQualityScore: number;   // 0-100: 加重平均
}
```

### 2. 品質チェック手法

#### A. ルールベースチェック（即座に実行）
```typescript
// 例：定量性チェック
function checkQuantifiable(keyResult: string): number {
  const quantifiers = [
    /\d+[\%％]/,           // 数値＋％
    /\d+[個件回人]/,       // 数値＋単位
    /\d+万円/,             // 金額
    /\d+時間/,             // 時間
    /(増加|向上|達成)\s*\d+/ // 動詞＋数値
  ];
  
  const matches = quantifiers.filter(regex => regex.test(keyResult));
  return Math.min(matches.length * 25, 100); // 最大100点
}

// 例：野心度チェック
function checkAmbition(objective: string, userProfile: UserProfile): number {
  const ambitiousWords = ['初', '新規', '革新', '突破', '達成', '創造'];
  const conservativeWords = ['維持', '継続', '安定', '保持'];
  
  let score = 50; // ベーススコア
  ambitiousWords.forEach(word => {
    if (objective.includes(word)) score += 10;
  });
  conservativeWords.forEach(word => {
    if (objective.includes(word)) score -= 15;
  });
  
  return Math.max(0, Math.min(100, score));
}
```

#### B. AI自己評価（LLM活用）
```typescript
async function aiQualityAssessment(okr: GeneratedOKR): Promise<OKRQualityMetrics> {
  const prompt = `
以下のOKRを評価してください：

目標: ${okr.objective}
成果指標:
${okr.keyResults.map((kr, i) => `${i+1}. ${kr.description}`).join('\n')}

評価基準:
1. 目標の明確性 (0-100): 曖昧な表現がないか
2. 野心度 (0-100): 70%達成で「上々」となる適切な難易度か
3. 現実性 (0-100): 期間内に達成可能か
4. 成果指標の定量性 (0-100): 数値で測定可能か
5. 関連性 (0-100): 成果指標が目標達成に直結するか

各項目を0-100で評価し、JSON形式で回答してください。
理由も簡潔に述べてください。
  `;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

#### C. ユーザーフィードバック学習
```typescript
interface UserFeedback {
  okrId: string;
  userRating: number;        // 1-5 ユーザー評価
  actualAchievement: number; // 実際の達成率
  difficulty: 'too_easy' | 'appropriate' | 'too_hard';
  clarity: 'unclear' | 'clear' | 'very_clear';
}

// フィードバックからAI品質を補正
function adjustQualityScore(
  initialScore: number, 
  feedback: UserFeedback[]
): number {
  const avgUserRating = feedback.reduce((sum, f) => sum + f.userRating, 0) / feedback.length;
  const adjustmentFactor = (avgUserRating - 3) * 10; // -20 ~ +20の調整
  
  return Math.max(0, Math.min(100, initialScore + adjustmentFactor));
}
```

## 実装に必要な追加テーブル

### 品質スコア詳細テーブル
```typescript
export const okrQualityAssessments = pgTable('okr_quality_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  yearlyOkrId: uuid('yearly_okr_id').references(() => yearlyOkrs.id),
  quarterlyOkrId: uuid('quarterly_okr_id').references(() => quarterlyOkrs.id),
  
  // 詳細スコア
  objectiveClarity: decimal('objective_clarity', { precision: 5, scale: 2 }),
  objectiveAmbition: decimal('objective_ambition', { precision: 5, scale: 2 }),
  objectiveRealism: decimal('objective_realism', { precision: 5, scale: 2 }),
  keyResultQuantifiable: decimal('key_result_quantifiable', { precision: 5, scale: 2 }),
  keyResultRelevance: decimal('key_result_relevance', { precision: 5, scale: 2 }),
  keyResultOutcome: decimal('key_result_outcome', { precision: 5, scale: 2 }),
  
  // メタデータ
  assessmentMethod: varchar('assessment_method', { length: 20 }), // 'rule_based', 'ai_generated', 'user_feedback'
  assessmentTimestamp: timestamp('assessment_timestamp').notNull().defaultNow(),
  assessorVersion: varchar('assessor_version', { length: 20 }), // AIモデルバージョン等
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ユーザーフィードバックテーブル
export const userFeedback = pgTable('user_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  yearlyOkrId: uuid('yearly_okr_id').references(() => yearlyOkrs.id),
  quarterlyOkrId: uuid('quarterly_okr_id').references(() => quarterlyOkrs.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  
  userRating: integer('user_rating').notNull(), // 1-5
  actualAchievement: decimal('actual_achievement', { precision: 5, scale: 2 }),
  difficulty: varchar('difficulty', { length: 20 }), // 'too_easy', 'appropriate', 'too_hard'
  clarity: varchar('clarity', { length: 20 }), // 'unclear', 'clear', 'very_clear'
  
  comments: text('comments'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

## 実装フロー

```typescript
async function generateAndAssessOKR(goalData: GoalData): Promise<AssessedOKR> {
  // 1. OKR生成
  const generatedOKR = await generateOKR(goalData);
  
  // 2. 即座にルールベースチェック
  const ruleBasedScore = await ruleBasedQualityCheck(generatedOKR);
  
  // 3. AI自己評価（非同期実行）
  const aiAssessmentPromise = aiQualityAssessment(generatedOKR);
  
  // 4. 初期品質スコアでユーザーに提示
  const okr = await saveOKRWithQuality(generatedOKR, ruleBasedScore);
  
  // 5. AI評価完了後に更新
  const aiAssessment = await aiAssessmentPromise;
  await updateQualityScore(okr.id, combineScores(ruleBasedScore, aiAssessment));
  
  return okr;
}
```

## ユーザー体験での活用

### 品質インジケーター
```typescript
interface QualityIndicator {
  score: number;
  level: 'excellent' | 'good' | 'needs_improvement';
  suggestions: string[];
}

function getQualityIndicator(score: number): QualityIndicator {
  if (score >= 80) return {
    score,
    level: 'excellent',
    suggestions: []
  };
  
  if (score >= 60) return {
    score,
    level: 'good', 
    suggestions: ['より具体的な数値目標を設定することで品質向上が期待できます']
  };
  
  return {
    score,
    level: 'needs_improvement',
    suggestions: [
      '成果指標をより定量的にしましょう',
      '目標の期限を明確にしましょう',
      '野心度を調整しましょう'
    ]
  };
}
```

### UI表示例
```typescript
// 品質スコア表示コンポーネント
function QualityScoreDisplay({ score }: { score: number }) {
  const indicator = getQualityIndicator(score);
  
  return (
    <div className="quality-score">
      <div className="score-badge">
        品質スコア: {score}点
        <span className={`level-${indicator.level}`}>
          {indicator.level === 'excellent' ? '✨ 優秀' : 
           indicator.level === 'good' ? '👍 良好' : '⚠️ 要改善'}
        </span>
      </div>
      
      {indicator.suggestions.length > 0 && (
        <div className="suggestions">
          <h4>改善提案:</h4>
          <ul>
            {indicator.suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## 継続的改善

### 学習データ収集
```typescript
interface QualityTrainingData {
  okrText: string;
  userProfile: UserProfile;
  initialAiScore: number;
  finalUserRating: number;
  actualAchievementRate: number;
  timeToComplete: number; // 完了にかかった時間
}

// 定期的にモデルを再学習
async function retrainQualityModel(trainingData: QualityTrainingData[]) {
  // 機械学習モデルで品質予測精度を向上
  // ユーザーの実際の満足度と達成率を教師データとして活用
}
```

### A/Bテストのサポート
```typescript
// 異なる品質評価アルゴリズムをテスト
interface QualityAssessmentExperiment {
  algorithmVersion: string;
  userGroup: 'control' | 'test_a' | 'test_b';
  scoreAccuracy: number; // 実際のユーザー満足度との相関
}
```

## 実装優先度

### Phase 1: MVP
- ルールベースの基本品質チェック
- 現在のスキーマの `aiGeneratedQualityScore` フィールド活用
- シンプルな品質表示

### Phase 2: 高度化
- AI自己評価の実装
- 詳細な品質テーブル追加
- ユーザーフィードバック収集

### Phase 3: 学習・最適化
- フィードバック学習システム
- A/Bテストフレームワーク
- 継続的モデル改善

## 備考
- 品質スコアは参考値として提示し、最終的な判断はユーザーに委ねる
- 文化的・個人的な価値観の違いを考慮した柔軟性を保つ
- プライバシーに配慮したデータ収集・活用を心がける
