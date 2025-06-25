'use server';

import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { Agent } from '@mastra/core';
import type { ActionResult } from './goals';
import type { Goal } from '@/lib/db/schema';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface NextQuestionData {
  question: string;
  type: string;
  depth: number;
}

export interface ConversationAnalysis {
  currentDepth: number;
  maxDepth: number;
  isComplete: boolean;
  completionPercentage: number;
  missingAspects: string[];
}

export interface ConversationSummary {
  userMotivation: string;
  keyInsights: string[];
  readinessLevel: number;
  recommendedActions: string[];
}

export async function generateNextQuestion(
  goalId: string,
  userId: string,
  chatHistory: ChatMessage[]
): Promise<ActionResult<NextQuestionData>> {
  try {
    // Validation
    if (!goalId || !userId) {
      return {
        success: false,
        error: 'Goal ID and User ID are required',
      };
    }

    // Check if goal exists and belongs to user
    const goalResult = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .limit(1);

    if (goalResult.length === 0) {
      return {
        success: false,
        error: 'Goal not found',
      };
    }

    const goal = goalResult[0];

    // Prepare chat context
    const conversationContext = chatHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
あなたは目標達成支援の専門コーチです。ユーザーの目標についてより深く理解するための次の質問を生成してください。

目標情報:
- タイトル: ${goal.title}
- 説明: ${goal.description}
- 達成期限: ${goal.dueDate}

これまでの対話:
${conversationContext}

以下のJSON形式で次の質問を生成してください:
{
  "question": "適切な深掘り質問",
  "type": "motivation|experience|resources|timeline|obstacles|values",
  "depth": 1-5の数値（深さレベル）
}

質問生成のガイドライン:
1. これまでの対話を踏まえて重複を避ける
2. 目標達成に必要な具体的な情報を引き出す
3. ユーザーの動機、経験、リソース、障害などを探る
4. 自然な会話の流れを保つ
5. JSON形式のみで応答（説明文は不要）
`;

    // Generate next question using AI
    const agent = new Agent({
      name: 'conversation-coach',
      instructions: 'You are an expert conversation coach for goal achievement.',
      model: {
        provider: 'openai',
        name: 'gpt-4',
      },
    });

    const response = await agent.generate(prompt);

    if (!response?.text) {
      return {
        success: false,
        error: 'Failed to generate next question',
      };
    }

    // Parse AI response
    let questionData: NextQuestionData;
    try {
      questionData = JSON.parse(response.text);
    } catch {
      return {
        success: false,
        error: 'Failed to parse AI response',
      };
    }

    return {
      success: true,
      data: questionData,
    };
  } catch (error) {
    console.error('Error generating next question:', error);
    return {
      success: false,
      error: 'Failed to generate next question',
    };
  }
}

export async function analyzeConversationDepth(
  chatHistory: ChatMessage[],
  goal: Goal
): Promise<ActionResult<ConversationAnalysis>> {
  try {
    const conversationContext = chatHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
あなたは対話分析の専門家です。以下の目標に関する対話の深さと完成度を分析してください。

目標情報:
- タイトル: ${goal.title}
- 説明: ${goal.description}

対話履歴:
${conversationContext}

以下のJSON形式で分析結果を返してください:
{
  "currentDepth": 1-5の数値,
  "maxDepth": 5,
  "isComplete": boolean,
  "completionPercentage": 0-100の数値,
  "missingAspects": ["不足している側面の配列"]
}

分析基準:
- 深さ1: 表面的な動機の確認
- 深さ2: 具体的な理由や背景の探索
- 深さ3: 経験や能力の把握
- 深さ4: 障害や課題の特定
- 深さ5: 行動計画の詳細化

JSON形式のみで応答してください。
`;

    const agent = new Agent({
      name: 'conversation-analyzer',
      instructions: 'You are an expert at analyzing conversation depth and completeness.',
      model: {
        provider: 'openai',
        name: 'gpt-4',
      },
    });

    const response = await agent.generate(prompt);

    if (!response?.text) {
      return {
        success: false,
        error: 'Failed to analyze conversation depth',
      };
    }

    let analysisData: ConversationAnalysis;
    try {
      analysisData = JSON.parse(response.text);
    } catch {
      return {
        success: false,
        error: 'Failed to parse analysis response',
      };
    }

    return {
      success: true,
      data: analysisData,
    };
  } catch (error) {
    console.error('Error analyzing conversation depth:', error);
    return {
      success: false,
      error: 'Failed to analyze conversation depth',
    };
  }
}

export async function generateConversationSummary(
  chatHistory: ChatMessage[],
  goal: Goal
): Promise<ActionResult<ConversationSummary>> {
  try {
    if (!chatHistory || chatHistory.length === 0) {
      return {
        success: false,
        error: 'Chat history is required',
      };
    }

    const conversationContext = chatHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
あなたは対話要約の専門家です。以下の目標に関する対話を分析し、要約を生成してください。

目標情報:
- タイトル: ${goal.title}
- 説明: ${goal.description}

対話履歴:
${conversationContext}

以下のJSON形式で要約を生成してください:
{
  "userMotivation": "ユーザーの主要な動機",
  "keyInsights": ["重要な洞察や発見の配列"],
  "readinessLevel": 1-10の数値（準備度レベル）,
  "recommendedActions": ["推奨アクションの配列"]
}

要約のポイント:
1. ユーザーの本当の動機を特定
2. 目標達成に影響する重要な要素を抽出
3. 現在の準備度を客観的に評価
4. 次のステップとして推奨される具体的行動

JSON形式のみで応答してください。
`;

    const agent = new Agent({
      name: 'conversation-summarizer',
      instructions: 'You are an expert at summarizing goal-oriented conversations.',
      model: {
        provider: 'openai',
        name: 'gpt-4',
      },
    });

    const response = await agent.generate(prompt);

    if (!response?.text) {
      return {
        success: false,
        error: 'Failed to generate conversation summary',
      };
    }

    let summaryData: ConversationSummary;
    try {
      summaryData = JSON.parse(response.text);
    } catch {
      return {
        success: false,
        error: 'Failed to parse summary response',
      };
    }

    return {
      success: true,
      data: summaryData,
    };
  } catch (error) {
    console.error('Error generating conversation summary:', error);
    return {
      success: false,
      error: 'Failed to generate conversation summary',
    };
  }
}