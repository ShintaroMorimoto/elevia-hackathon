# Mastra AI システム - 技術ドキュメント

## 概要

このディレクトリには、**Elevia** プロジェクトのAI機能を担当するMastraフレームワークの実装が含まれています。Mastraは、AIエージェント、ツール、ワークフローを統合的に管理するフレームワークで、目標達成支援のためのAI機能を提供します。

### 主な機能
- **対話エージェント**: ユーザーとの自然な対話を通じて目標の詳細を聞き出す
- **計画エージェント**: 収集した情報を基に具体的なOKRプランを生成する
- **動的質問生成**: ユーザーの回答に応じて文脈に沿った質問を生成
- **OKR生成**: 年次・四半期レベルの具体的で測定可能なOKRを自動生成

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

ユーザーの目標を分析し、対話の深度を評価するツールです。

```typescript
export const goalAnalysisTool = createTool({
  id: 'analyze-goal',
  description: 'ユーザーの目標を分析し、深掘り質問を生成する',
  inputSchema: z.object({
    goalId: z.string(),
    userId: z.string(),
    chatHistory: z.array(z.object({
      role: z.string(),
      content: z.string(),
    })),
  }),
  outputSchema: z.object({
    currentDepth: z.number(),
    maxDepth: z.number(),
    isComplete: z.boolean(),
    completionPercentage: z.number(),
    missingAspects: z.array(z.string()),
  }),
});
```

**機能:**
- 対話の深さを数値化（0-5の範囲）
- 不足している観点を特定
- 完了度をパーセンテージで算出

### 2. generateQuestionTool (`tools/goal-tools.ts`)

動的な質問生成を行うツールです。

```typescript
export const generateQuestionTool = createTool({
  id: 'generate-question',
  description: '目標達成のための次の質問を生成する',
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
  }),
});
```

**特徴:**
- **文脈認識**: 前回の回答内容を分析してキーワード検出
- **動的質問選択**: ユーザーの回答に応じて質問タイプを変更
- **8つの質問タイプ**: motivation, experience, resources, timeline, obstacles, values, details, context

**質問生成ロジック:**
```typescript
// 深度0: 動機について
if (currentDepth === 0) {
  type = 'motivation';
  question = `なぜ「${goalTitle}」を達成したいのですか？`;
}
// 深度1: 経験について  
else if (currentDepth === 1) {
  type = 'experience';
  question = `「${goalTitle}」に関連して、どのような経験がありますか？`;
}
// 深度2以上: 文脈に応じた動的質問
else {
  if (lastUserMessage.includes('時間')) {
    type = 'timeline';
    question = '具体的なスケジュールについて詳しく教えてください';
  }
  // その他のキーワード検出...
}
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

## 現在の制限事項とトラブルシューティング

### 1. ワークフローの最適化

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

**利点**: 
- 型エラーが解消され安定動作
- パフォーマンスが大幅向上
- メンテナンスが容易

### 2. Vertex AI設定

**問題**: プロジェクト設定での型エラー
```typescript
// agents/conversation-agent.ts
model: vertex('gemini-2.0-flash-001'), // project設定は削除済み
```

**対処法**: 環境変数`GOOGLE_VERTEX_PROJECT_ID`で設定

### 3. データベース型変換

**問題**: PostgreSQLのdecimal型が文字列として返される
```typescript
// 対処法: parseFloatで数値変換
const targetValue = parseFloat(kr.targetValue || '0');
const currentValue = parseFloat(kr.currentValue || '0');
```

### 4. LibSQL依存関係

**問題**: Webpackビルド時のlibsql依存関係エラー

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

### 1. ワークフロー拡張

- 条件分岐を持つワークフローの実装
- ユーザーフィードバックループの組み込み
- 段階的なOKR改善プロセスの追加

### 2. エージェント拡張

- **評価エージェント**: OKRの達成度評価
- **アドバイザーエージェント**: 改善提案の生成

### 3. ツール追加

- **進捗分析ツール**: 定期的な進捗レポート生成
- **リマインダーツール**: 期限管理とアラート

## 関連ドキュメント

- [Mastra公式ドキュメント](https://docs.mastra.ai/)
- [Vertex AI API Reference](https://cloud.google.com/vertex-ai/docs)
- [Zod Documentation](https://zod.dev/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

---

**最終更新**: 2025年6月28日  
**バージョン**: 1.0.0  
**作成者**: Claude Code Assistant