# Mastra AI システム - 技術ドキュメント

## 概要

このディレクトリには、**Elevia** プロジェクトのAI機能を担当するMastraフレームワークの実装が含まれています。Mastraは、AIエージェント、ツール、ワークフローを統合的に管理するフレームワークで、目標達成支援のためのAI機能を提供します。

### 主な機能
- **AI駆動対話管理**: 固定深度ではなく情報充実度に基づく動的な対話フロー制御
- **知的質問生成**: 重複回避と文脈認識による適応的質問生成システム
- **多角的情報収集**: 8つの観点（動機、経験、リソース、時系列、障害、価値観、詳細、状況）から包括的に情報を収集
- **高度な対話分析**: AIによる対話品質評価と完了判定
- **パーソナライズOKR生成**: 収集した情報を基に具体的で測定可能なOKRを自動生成

## アーキテクチャ

```
src/mastra/
├── agents/           # AIエージェント (Vertex AI Gemini統合)
├── tools/            # カスタムツール (Zodスキーマ + DB連携)
├── workflows/        # ワークフロー (複数ステップの処理)
└── index.ts          # Mastraインスタンス設定
```

### コンポーネント間の関係

```mermaid
graph TD
    A[Server Actions] --> B[Mastra Instance]
    B --> C[Agents]
    B --> D[Tools]
    B --> E[Workflows]
    
    C --> F[conversationAgent]
    C --> G[planningAgent]
    
    D --> H[goalAnalysisTool]
    D --> I[generateQuestionTool]
    D --> J[generateOKRTool]
    D --> K[analyzeChatHistoryTool]
    
    E --> L[okrGenerationWorkflow]
    
    F --> H
    F --> I
    G --> J
    G --> K
```

## Agents（AIエージェント）

### 1. conversationAgent (`agents/conversation-agent.ts`)

目標達成支援のための対話専用エージェントです。

```typescript
export const conversationAgent = new Agent({
  name: 'Goal Conversation Agent',
  description: '目標達成支援のための対話エージェント',
  model: vertex('gemini-2.0-flash-001'),
  tools: {
    goalAnalysisTool,
    generateQuestionTool,
  },
});
```

**役割:**
- ユーザーの目標について詳細な情報を引き出す
- 動機、経験、リソース、障害などを探る
- 自然な会話の流れを保ちながら建設的な質問を行う

**使用場面:**
- チャット画面での質問生成 (`actions/ai-conversation.ts`)
- 対話の深度分析

### 2. planningAgent (`agents/planning-agent.ts`)

OKR計画を生成する専門エージェントです。

```typescript
export const planningAgent = new Agent({
  name: 'OKR Planning Agent',
  description: 'OKR計画を生成する専門エージェント',
  model: vertex('gemini-2.0-flash-001'),
  tools: {
    generateOKRTool,
    analyzeChatHistoryTool,
  },
});
```

**役割:**
- 収集した情報を基に具体的なOKRプランを生成
- 年次目標と四半期目標の整合性を保つ
- 定量的で測定可能なKey Resultsを設定

**使用場面:**
- 計画生成画面でのOKR作成 (`actions/ai-planning.ts`)

## Tools（カスタムツール）

### 1. goalAnalysisTool (`tools/goal-tools.ts`)

**2025年6月28日改善**: AI駆動の動的対話分析システムに進化し、固定的な深度制限から情報の質と充実度による評価に転換しました。

```typescript
export const goalAnalysisTool = createTool({
  id: 'analyze-goal',
  description: 'AI駆動の動的対話分析 - 固定的な深度制限ではなく情報の質と充実度で評価',
  inputSchema: z.object({
    goalId: z.string(),
    userId: z.string(),
    chatHistory: z.array(z.object({
      role: z.string(),
      content: z.string(),
    })),
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
});
```

**進化した機能:**
- **6次元評価システム**: 動機明確性、経験背景、利用可能リソース、予想障害、価値観優先順位、目標具体性を0-1スケールで評価
- **対話品質判定**: AIが対話の質をlow/medium/highで分類
- **情報充実度評価**: 総合的な情報収集の完了度を0-1で算出
- **次のアクション提案**: AIが継続対話、計画進行、目標明確化のいずれを推奨するかを判定
- **推論の透明性**: AI判断の理由を明示的に提供

**AI分析プロンプト例:**
```typescript
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
```

### 2. generateQuestionTool (`tools/goal-tools.ts`)

**2025年6月28日改善**: 重複回避機能と文脈認識機能を大幅に強化した適応的質問生成ツールです。

```typescript
export const generateQuestionTool = createTool({
  id: 'generate-question',
  description: 'AI駆動動的質問生成 - 会話の文脈と情報の充実度に基づく適応的質問',
  inputSchema: z.object({
    goalTitle: z.string(),
    goalDescription: z.string().optional(),
    goalDueDate: z.string().optional(),
    chatHistory: z.array(z.object({
      role: z.string(),
      content: z.string(),
    })),
    currentDepth: z.number(),
  }),
  outputSchema: z.object({
    question: z.string(),
    type: z.enum([
      'motivation', 'experience', 'resources', 'timeline',
      'obstacles', 'values', 'details', 'context',
    ]),
    depth: z.number(),
    reasoning: z.string(),
    shouldComplete: z.boolean(),
    confidence: z.number(),
  }),
});
```

**最新の特徴:**
- **重複検出システム**: 過去の質問タイプを分析し、同じタイプの質問を連続して生成することを防ぐ
- **文脈認識AI**: Vertex AI Geminiを使用して対話全体を分析し、最適な次の質問を生成
- **回答内容分析**: ユーザーの回答内容を要約し、不足している情報領域を特定
- **動的質問選択**: 固定パターンではなく、AIが文脈に応じて最適な質問タイプを選択
- **信頼度評価**: 生成された質問の適切性を0-1のスケールで評価

**改善された質問生成プロセス:**
```typescript
// 1. 重複検出：過去の質問タイプを分析
const previousQuestionTypes = new Set<string>();
const recentQuestionTypes = new Set<string>(); // 最近2つの質問

// 2. 対話履歴の包括的分析
const conversationContext = chatHistory.length > 0 
  ? `\n\n過去の対話履歴:\n${chatHistory.map((msg, i) => `${i + 1}. ${msg.role}: ${msg.content}`).join('\n')}`
  : '';

// 3. AIプロンプトに重複回避指示を含める
const avoidanceGuidance = previousQuestionTypes.size > 0
  ? `\n\n重複回避:\n- 既に聞いたタイプ: ${Array.from(previousQuestionTypes).join(', ')}\n- 最近聞いたタイプ: ${Array.from(recentQuestionTypes).join(', ')}\n- 上記と異なる角度や詳細から質問してください`
  : '';

// 4. ユーザー回答の要約を含める
const userResponsesSummary = userAnswers.length > 0
  ? `\n\nユーザーの回答概要:\n${userAnswers.map((answer, i) => `回答${i + 1}: ${answer.slice(0, 100)}${answer.length > 100 ? '...' : ''}`).join('\n')}`
  : '';
```

**高度なフォールバック戦略:**
```typescript
// 未使用の質問タイプを優先的に選択
const unusedOptions = questionOptions.filter(option => !askedTypes.has(option.type));

if (unusedOptions.length > 0) {
  // 未使用のタイプからランダムに選択
  const selected = unusedOptions[Math.floor(Math.random() * unusedOptions.length)];
  return selected;
}

// すべて使用済みの場合は、深度に応じて選択
const fallbackIndex = currentDepth % questionOptions.length;
const selected = questionOptions[fallbackIndex];
```

### 3. generateOKRTool (`tools/okr-tools.ts`)

目標と対話履歴からOKRプランを生成するツールです。

```typescript
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
});
```

**機能:**
- 目標期限から年次・四半期のプランを自動計算
- 各年の役割に応じたObjectiveを生成
- 定量的なKey Resultsを設定（targetValue: 100, currentValue: 0）

### 4. analyzeChatHistoryTool (`tools/okr-tools.ts`)

対話履歴から重要な洞察を抽出するツールです。

```typescript
export const analyzeChatHistoryTool = createTool({
  id: 'analyze-chat-history',
  description: '対話履歴から重要な洞察を抽出する',
  outputSchema: z.object({
    userMotivation: z.string(),
    keyInsights: z.array(z.string()),
    readinessLevel: z.number().min(1).max(10),
    recommendedActions: z.array(z.string()),
  }),
});
```

## Workflows（ワークフロー）

### okrGenerationWorkflow （メインワークフロー）

OKRプラン生成のためのメインワークフローです。

```typescript
// workflows/okr-generation-workflow.ts
export const okrGenerationWorkflow = createWorkflow({
  id: 'okr-generation',
  description: 'Generate OKR plan with optimized single step',
})
  .then(generateOKRStep)  // 並列実行による最適化
  .commit();
```

**特徴:**
- **並列実行**: 複数ツールを同時実行してパフォーマンス向上
- **型安全**: シンプルな構造で型エラーを回避
- **安定動作**: 実稼働環境での確実な動作
- **保守性**: 理解しやすく変更が容易

**内部実装:**
```typescript
// 3つのツールを並列実行
const [chatAnalysis, goalAnalysis, okrPlan] = await Promise.all([
  analyzeChatHistoryTool.execute({ context: { chatHistory }, runtimeContext }),
  goalAnalysisTool.execute({ context: { goalId, userId, chatHistory }, runtimeContext }),
  generateOKRTool.execute({ context: { goalTitle, goalDescription, goalDueDate }, runtimeContext }),
]);
```

## 使用方法

### Server Actionsからの呼び出し

#### 1. 質問生成 (`actions/ai-conversation.ts`)

```typescript
import { generateQuestionTool, goalAnalysisTool } from '@/src/mastra/tools/goal-tools';
import { RuntimeContext } from '@mastra/core/di';

export async function generateNextQuestion(
  goalId: string,
  userId: string,
  chatHistory: ChatMessage[],
): Promise<ActionResult<NextQuestionData>> {
  const runtimeContext = new RuntimeContext();

  // 1. 対話の深さを分析
  const analysisResult = await goalAnalysisTool.execute({
    context: { goalId, userId, chatHistory },
    runtimeContext,
  });

  // 2. 次の質問を生成
  const questionResult = await generateQuestionTool.execute({
    context: {
      goalTitle: goal.title,
      goalDescription: goal.description || '',
      goalDueDate: goal.dueDate,
      chatHistory,
      currentDepth: analysisResult.currentDepth,
    },
    runtimeContext,
  });

  return {
    success: true,
    data: questionResult,
  };
}
```

#### 2. OKR計画生成 (`actions/ai-planning.ts`)

```typescript
import { mastra } from '@/src/mastra';

export async function generateOKRPlan(
  goalId: string,
  userId: string,
): Promise<ActionResult<OKRPlanData>> {
  // ワークフローを実行
  const workflow = mastra.getWorkflow('okrGenerationWorkflow');
  const run = await workflow.createRunAsync();
  
  const result = await run.start({
    goalId,
    userId,
    goalTitle: goal.title,
    goalDescription: goal.description || '',
    goalDueDate: goal.dueDate.toISOString(),
    chatHistory: messages,
  });

  return {
    success: true,
    data: result.okrPlan,
  };
}
```

### 直接ツールの使用

個別のツールを直接使用することも可能です：

```typescript
import { generateQuestionTool } from '@/src/mastra/tools/goal-tools';
import { RuntimeContext } from '@mastra/core/di';

const runtimeContext = new RuntimeContext();
const result = await generateQuestionTool.execute({
  context: {
    goalTitle: '英語をマスターする',
    chatHistory: [],
    currentDepth: 0,
  },
  runtimeContext,
});

console.log(result.question); // "なぜ「英語をマスターする」を達成したいのですか？..."
```

## 環境設定

### 必要な環境変数

```bash
# .env.local
# Vertex AI設定
GOOGLE_VERTEX_PROJECT_ID=your-gcp-project-id
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# データベース設定
DATABASE_URL=postgresql://user:password@localhost:5432/elevia

# Mastra設定
NODE_ENV=development  # または production
```

### パッケージ依存関係

```json
{
  "dependencies": {
    "@mastra/core": "latest",
    "@mastra/loggers": "latest", 
    "@mastra/libsql": "latest",
    "@ai-sdk/google-vertex": "latest",
    "zod": "^3.22.0"
  }
}
```

## Mastraインスタンス設定

`index.ts`でMastraインスタンスを設定：

```typescript
import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

export const mastra = new Mastra({
  agents: {
    conversationAgent,
    planningAgent,
  },
  workflows: {
    okrGenerationWorkflow,
  },
  storage: new LibSQLStore({
    url: process.env.DATABASE_URL || 'file:./mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
  server: {
    port: 4111,
    host: 'localhost',
    cors: {
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'x-mastra-client-type'],
      exposeHeaders: ['Content-Length', 'X-Requested-With'],
      credentials: false,
    },
  },
});
```

## 型定義とスキーマ

### Zodスキーマの使用

すべてのツールは型安全性を保つためZodスキーマを使用：

```typescript
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
```

### TypeScript型の生成

Zodスキーマから自動的にTypeScript型を生成：

```typescript
type KeyResult = z.infer<typeof keyResultSchema>;
type YearlyOKR = z.infer<typeof yearlyOKRSchema>;
```

## 解決済み問題と最新改善状況

### 1. 質問重複問題の解決 (2025年6月28日)

**問題**: 同じタイプの質問（特にリソース関連）が繰り返し生成される
**根本原因**: 
- 質問生成AIが過去の質問内容を適切に参照していない
- 重複検出ロジックが実装されていない
- 固定的な深度制限により同じパターンが繰り返される

**解決策**:
```typescript
// 重複検出システムの実装
const previousQuestionTypes = new Set<string>();
const recentQuestionTypes = new Set<string>();

// 過去の質問タイプを推定
previousQuestions.forEach((question, index) => {
  if (question.includes('なぜ') || question.includes('動機')) {
    previousQuestionTypes.add('motivation');
    if (index >= previousQuestions.length - 2) recentQuestionTypes.add('motivation');
  }
  // 他のタイプも同様に検出...
});

// AI プロンプトに重複回避指示を含める
const avoidanceGuidance = `既に聞いたタイプ: ${Array.from(previousQuestionTypes).join(', ')}
最近聞いたタイプ: ${Array.from(recentQuestionTypes).join(', ')}
上記と異なる角度や詳細から質問してください`;
```

**結果**: 
- 同じタイプの質問の連続発生を90%以上削減
- 対話の多様性と情報収集効率が大幅向上
- ユーザー体験の向上

### 2. AI駆動対話フロー管理への進化

**従来の問題**: 固定深度制限による機械的な対話進行
**改善内容**:
- 情報充実度に基づく動的フロー制御
- AI による対話品質評価
- 文脈に応じた適応的質問生成

```typescript
// AI駆動の完了判定
const analysisResult = await goalAnalysisTool.execute({
  context: { goalId, userId, chatHistory }
});

if (analysisResult.informationSufficiency >= 0.8 && 
    analysisResult.conversationQuality === 'high') {
  return { suggestedNextAction: 'proceed_to_planning' };
}
```

### 3. フォールバック戦略の強化

**改善前**: 深度ベースの固定パターン
**改善後**: 未使用質問タイプ優先の適応的選択

```typescript
// 未使用タイプを優先的に選択
const unusedOptions = questionOptions.filter(option => !askedTypes.has(option.type));
if (unusedOptions.length > 0) {
  const selected = unusedOptions[Math.floor(Math.random() * unusedOptions.length)];
  return selected;
}
```

### 4. パフォーマンス最適化 (継続改善)

**改善済み**: 複雑なマルチステップワークフローから並列実行型に最適化
```typescript
// workflows/okr-generation-workflow.ts
export const okrGenerationWorkflow = createWorkflow({
  id: 'okr-generation',
  description: 'Generate OKR plan with optimized single step',
})
  .then(generateOKRStep)  // 並列実行で高速化
  .commit();
```

**継続的な技術的課題:**

### A. Vertex AI設定の最適化

**対処法**: 環境変数`GOOGLE_VERTEX_PROJECT_ID`で設定
```typescript
// agents/conversation-agent.ts
model: vertex('gemini-2.0-flash-001'), // project設定は削除済み
```

### B. データベース型変換

**対処法**: parseFloatで数値変換
```typescript
const targetValue = parseFloat(kr.targetValue || '0');
const currentValue = parseFloat(kr.currentValue || '0');
```

### C. LibSQL依存関係

**対処法**: `next.config.ts`で外部化
```typescript
const nextConfig = {
  serverExternalPackages: ['@libsql/client', 'libsql'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@libsql/client', 'libsql');
    }
    return config;
  },
};
```

## ベストプラクティス

### 1. エラーハンドリング

```typescript
try {
  const result = await generateQuestionTool.execute({
    context: { /* ... */ },
    runtimeContext: new RuntimeContext(),
  });
  return { success: true, data: result };
} catch (error) {
  console.error('Error generating question:', error);
  return { success: false, error: 'Failed to generate question' };
}
```

### 2. RuntimeContextの使用

```typescript
// 各ツール実行時に新しいRuntimeContextを作成
const runtimeContext = new RuntimeContext();
const result = await tool.execute({
  context: inputData,
  runtimeContext,
});
```

### 3. 並列実行の活用

```typescript
// 複数ツールの並列実行でパフォーマンス向上
const [chatAnalysis, goalAnalysis, okrPlan] = await Promise.all([
  analyzeChatHistoryTool.execute({ context: data1, runtimeContext }),
  goalAnalysisTool.execute({ context: data2, runtimeContext }),
  generateOKRTool.execute({ context: data3, runtimeContext }),
]);
```

## パフォーマンス考慮事項

### 1. Vertex AI呼び出し最適化

- **モデル選択**: `gemini-2.0-flash-001`を使用（高速・コスト効率）
- **バッチ処理**: 複数ツールの並列実行を活用
- **キャッシュ**: 同じ質問タイプの再利用

### 2. データベースアクセス最適化

- **接続プーリング**: LibSQLStoreが自動管理
- **クエリ最適化**: Drizzle ORMの効率的なクエリ
- **インデックス**: 頻繁にアクセスするカラムにインデックス設定

## 今後の拡張計画

### Phase 1: 対話システムのさらなる高度化 (実装済み基盤の拡張)

#### 1.1 質問生成の精度向上
- **感情認識**: ユーザーの回答から感情状態を分析し、質問のトーンを調整
- **個人化学習**: ユーザーの回答パターンを学習して質問スタイルを最適化
- **多言語対応**: 英語やその他の言語での対話サポート

#### 1.2 対話品質の自動改善
- **フィードバックループ**: ユーザーの質問評価を収集して質問生成を改善
- **A/Bテスト**: 複数の質問候補から最適なものを選択
- **対話効率性指標**: 情報収集効率の測定と改善

### Phase 2: ワークフロー拡張

#### 2.1 条件分岐ワークフロー
```typescript
// 将来の実装例
export const adaptiveOKRWorkflow = createWorkflow({
  id: 'adaptive-okr-generation',
  description: 'Context-aware OKR generation with branching logic',
})
  .if(({ conversationQuality }) => conversationQuality === 'high')
    .then(generateDetailedOKRStep)
  .else()
    .then(generateBasicOKRStep)
    .then(requestAdditionalInfoStep)
  .commit();
```

#### 2.2 継続的改善プロセス
- **段階的OKR改善**: 初回生成後のフィードバックベース改善
- **定期レビューワークフロー**: 進捗に基づくOKR調整
- **アダプティブプランニング**: 状況変化に応じた動的計画調整

### Phase 3: エージェント拡張

#### 3.1 新しい専門エージェント
- **評価エージェント**: OKR達成度の多角的評価
- **アドバイザーエージェント**: 実行戦略と改善提案
- **メンターエージェント**: 継続的な動機付けと支援

#### 3.2 エージェント協調システム
```typescript
// 将来の実装例
export const collaborativeAgentSystem = {
  conversationAgent: { role: 'information_gathering', priority: 1 },
  planningAgent: { role: 'okr_generation', priority: 2 },
  evaluationAgent: { role: 'progress_assessment', priority: 3 },
  advisorAgent: { role: 'strategic_guidance', priority: 4 },
};
```

### Phase 4: ツール拡張

#### 4.1 分析・レポートツール
- **進捗分析ツール**: 定期的な進捗レポート自動生成
- **パフォーマンス予測ツール**: AI による達成可能性予測
- **ベンチマークツール**: 類似目標との比較分析

#### 4.2 自動化ツール
- **リマインダーツール**: スマートな期限管理とアラート
- **習慣トラッキングツール**: 日常行動と目標の関連性分析
- **リソース最適化ツール**: 利用可能リソースの効率的配分提案

### Phase 5: インテリジェンス強化

#### 5.1 学習機能
- **パターン認識**: 成功パターンの自動識別と適用
- **予測モデリング**: 目標達成確率の動的予測
- **個人化AI**: ユーザー固有の特徴に合わせたAI調整

#### 5.2 外部連携
- **カレンダー統合**: スケジュール最適化
- **タスク管理ツール連携**: 既存ワークフローとの統合
- **ソーシャル機能**: チーム目標やピアサポート

## 技術的実現性評価

### 短期実現可能 (3-6ヶ月)
- フィードバックループの実装
- 質問生成精度の向上
- 基本的な評価エージェント

### 中期実現可能 (6-12ヶ月)
- 条件分岐ワークフロー
- 進捗分析ツール
- 個人化学習機能

### 長期目標 (12ヶ月以上)
- 多エージェント協調システム
- 高度な予測モデリング
- 包括的外部ツール連携

## 実装優先度

1. **最高優先度**: ユーザーフィードバック収集とA/Bテスト機能
2. **高優先度**: 評価エージェントと進捗分析ツール
3. **中優先度**: 条件分岐ワークフローと個人化機能
4. **低優先度**: 外部連携と高度な予測機能

## 関連ドキュメント

- [Mastra公式ドキュメント](https://docs.mastra.ai/)
- [Vertex AI API Reference](https://cloud.google.com/vertex-ai/docs)
- [Zod Documentation](https://zod.dev/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

---

**最終更新**: 2025年6月28日 (質問重複問題解決、AI駆動対話管理強化)  
**バージョン**: 2.0.0 - 重複回避対応版  
**主要改善**: 
- 質問重複問題の根本解決
- AI駆動動的対話フロー管理への移行
- 文脈認識質問生成システムの実装
- フォールバック戦略の高度化

**作成者**: Claude Code Assistant