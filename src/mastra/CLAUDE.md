# Mastra統合 問題分析レポート

## 📅 作成日: 2025年12月28日 | 最終更新: 2025年12月28日

## 🎯 概要

このドキュメントは、Mastra統合における型エラーと実装上の問題を包括的に分析し、修正方針を明確化するためのものです。現在、ワークフローファイル（`okr-generation-workflow.ts`）で複数の型エラーが発生しており、AI機能の一部が無効化されています。

## ✅ **Phase 1 緊急修正 - 完了（2025/12/28）**

### 🚀 **修正済み項目**

#### 1. ✅ ビルドエラー解決
- **問題**: TypeScriptコンパイルエラー（7件）によりビルド失敗
- **解決策**: ワークフローを一時的に無効化し、個別ツール実行（Server Actions）を使用
- **結果**: ✅ ビルド成功 - `pnpm build` 完全通過

#### 2. ✅ AI機能の復旧
- **実装**: `actions/ai-planning.ts`で個別ツール実行パターンを実装
- **動作確認**: RuntimeContext追加により、以下のツールが正常動作
  - `analyzeChatHistoryTool.execute()`
  - `goalAnalysisTool.execute()`  
  - `generateOKRTool.execute()`

#### 3. ✅ 型整合性の修正
- **修正ファイル**:
  - `app/utils/plan-generation-helpers.ts`: `generatedPlan.okrPlan.yearly`の型修正
  - `actions/ai-planning.ts`: `GeneratedPlan`インターフェースの統一
  - `src/mastra/index.ts`: ワークフローの一時的無効化

### 📊 **現在の動作状況**

| 機能 | 状況 | 実装方法 |
|------|------|----------|
| 🔧 ビルド | ✅ 成功 | TypeScript完全通過 |
| 🤖 AI対話分析 | ✅ 動作 | Server Actions + 個別ツール |
| 📋 OKR生成 | ✅ 動作 | Server Actions + 個別ツール |
| 💾 データベース保存 | ✅ 動作 | Yearly OKR + Key Results |
| 🔄 ワークフロー | 🔶 無効化 | Phase 2で修正予定 |
| 📈 Quarterly OKR | 🔶 一時無効 | Phase 2で実装予定 |

## 🔍 発見された問題

### 1. 🔴 **未使用のエージェント**

#### 現状
- `conversationAgent`と`planningAgent`がインポートされているが、実際には使用されていない
- ワークフロー内では直接ツールを呼び出している

```typescript
// インポートのみ存在
import { conversationAgent } from '../agents/conversation-agent';
import { planningAgent } from '../agents/planning-agent';

// 実際はツールのみ使用
const result = await analyzeChatHistoryTool.execute({...});
```

#### 影響
- エージェントの高度な機能（プロンプト、モデル設定など）が活用されていない
- コードの冗長性

### 2. 🟡 **RuntimeContextの型エラー（修正済み）**

#### ✅ 解決済み
Mastraツールの`execute`メソッドに`RuntimeContext`を正しく追加

#### 修正後の実装
```typescript
const runtimeContext = new RuntimeContext();

const result = await analyzeChatHistoryTool.execute({
  context: {
    chatHistory: inputData.chatHistory,
  },
  runtimeContext, // ✅ 追加済み
});
```

### 3. 🔴 **ワークフローステップの型不一致（一時的に無効化）**

#### 問題点
1. **入力スキーマの不一致**
   - `analyzeChatStep`の入力に`goalTitle`、`goalDescription`、`goalDueDate`が含まれていない
   - ワークフロー全体の入力スキーマとステップの入力スキーマが不整合

2. **map関数の使用方法**
   - `.map()`メソッドがPromiseではなくオブジェクトを返している
   - 新しいワークフローAPIの仕様と不一致

#### 一時的解決策
```typescript
// TEMPORARY: ワークフロー全体を無効化（型エラー修正中）
export const okrGenerationWorkflow = null;
```

### 4. 🔴 **Mastra API仕様の不整合**

#### 観察された問題
- ワークフローの`execute`関数に`mastra`パラメータが渡されるが使用されていない
- 新旧のAPIパターンが混在している可能性
- ドキュメントと実装の乖離

## 📊 影響分析

### ビルドへの影響
- ✅ TypeScriptコンパイルエラー解決済み
- ✅ `okr-generation-workflow.ts`が一時的に無効化
- ✅ `ai-planning.ts`で個別ツール実行に変更

### 機能への影響
- ✅ AI計画生成機能が個別ツール実行で正常動作
- ✅ 個別のツール実行（Server Actions経由）は正常動作
- ✅ UI-DB統合は影響なし

## 🛠️ 修正方針

### ✅ Phase 1: 緊急修正（型エラー解決）- **完了**

#### ✅ 1. RuntimeContext追加 - **完了**
```typescript
// 各ステップのexecute関数内で
execute: async ({ inputData, mastra }) => {
  const runtimeContext = new RuntimeContext(); // ✅ 追加済み
  
  const result = await analyzeChatHistoryTool.execute({
    context: {
      chatHistory: inputData.chatHistory,
    },
    runtimeContext, // ✅ 追加済み
  });
  
  return result;
}
```

#### ✅ 2. 個別ツール実行パターン実装 - **完了**
```typescript
// TEMPORARY: ワークフローが無効化されているため、個別ツールを直接使用
const runtimeContext = new RuntimeContext();

// Step 1: 対話履歴の分析 ✅
const chatAnalysis = await analyzeChatHistoryTool.execute({
  context: { chatHistory },
  runtimeContext,
});

// Step 2: 目標の詳細分析 ✅
const goalAnalysis = await goalAnalysisTool.execute({
  context: { goalId, userId, chatHistory },
  runtimeContext,
});

// Step 3: OKRプランの生成 ✅
const okrPlan = await generateOKRTool.execute({
  context: {
    goalTitle: goal.title,
    goalDescription: goal.description || '',
    goalDueDate: goal.dueDate,
    chatInsights: { motivation: chatAnalysis.userMotivation },
  },
  runtimeContext,
});
```

### 🔄 Phase 2: アーキテクチャ改善（次のステップ）

#### 1. ワークフローの修正
```typescript
// 正しいワークフロー実装パターン（Phase 2で実装予定）
const workflowInputSchema = z.object({
  goalId: z.string(),
  userId: z.string(),
  goalTitle: z.string(),
  goalDescription: z.string(),
  goalDueDate: z.string(),
  chatHistory: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })),
});

// ステップでも同じスキーマを使用
const analyzeChatStep = createStep({
  inputSchema: workflowInputSchema, // 統一されたスキーマ
  // ...
});
```

#### 2. エージェントの活用
```typescript
// ツール直接呼び出しから、エージェント経由へ
const result = await conversationAgent.generate(
  "対話履歴を分析して洞察を抽出してください",
  {
    toolsets: {
      analysis: { analyzeChatHistoryTool },
    },
    runtimeContext,
  }
);
```

#### 3. Quarterly OKRの実装
- yearly OKR IDを取得してからquarterly OKRを保存
- 適切なリレーション設定

### Phase 3: 長期的改善

#### 1. 型定義の整備
- `ToolExecutionContext`の正確な型定義を`types.ts`に追加
- ワークフロー関連の型を統一

#### 2. ドキュメント整備
- Mastra統合パターンのベストプラクティス文書化
- 社内向けガイドライン作成

#### 3. テスト追加
- ワークフロー実行のE2Eテスト
- エージェント統合テスト

## 🚀 実装優先順位

1. ✅ **最優先**: RuntimeContextエラーの修正（ビルド通過のため）- **完了**
2. 🔄 **高**: ワークフローの型整合性確保 - **Phase 2**
3. 🔄 **中**: エージェントの活用検討 - **Phase 2**
4. 🔄 **低**: アーキテクチャの最適化 - **Phase 3**

## 📝 参考情報

### ✅ Server Actions での正しい実装例（動作確認済み）
```typescript
// actions/ai-conversation.ts
const runtimeContext = new RuntimeContext();
const result = await goalAnalysisTool.execute({
  context: { goalId, userId, chatHistory },
  runtimeContext, // ✅ 正しく実装されている
});
```

### Mastraドキュメント参照箇所
- [Tools Overview](https://mastra.ai/docs/tools-mcp/overview)
- [Dynamic Tool Context](https://mastra.ai/docs/tools-mcp/dynamic-context)
- [Workflow Reference](https://mastra.ai/reference/workflows/)

## 🎯 次のアクション

### Phase 2 実装予定
1. [ ] `okr-generation-workflow.ts`の型エラー修正
2. [ ] ワークフロー入力スキーマの統一
3. [ ] `.map()`メソッドの使用方法見直し
4. [ ] Quarterly OKR保存機能の実装
5. [ ] エージェント活用の検討

### 現在の動作確認
- ✅ ビルド成功
- ✅ AI対話分析機能動作
- ✅ OKR生成機能動作
- ✅ データベース保存動作

## 更新履歴

- 2025/12/28 09:00: 初版作成 - Mastra統合の問題分析と修正方針策定
- 2025/12/28 11:30: **Phase 1完了** - ビルドエラー解決、AI機能復旧確認 