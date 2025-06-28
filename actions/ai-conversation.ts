'use server';

import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { RuntimeContext } from '@mastra/core/di';
import {
  generateQuestionTool,
  goalAnalysisTool,
} from '@/src/mastra/tools/goal-tools';
import { analyzeChatHistoryTool } from '@/src/mastra/tools/okr-tools';
import type { ActionResult } from './goals';
import type { Goal } from '@/lib/db/schema';
import type {
  ChatMessage,
  NextQuestionData,
  DynamicNextQuestionData,
  ConversationAnalysis,
  DynamicConversationAnalysis,
  ConversationSummary,
} from '@/types/mastra';

export async function generateNextQuestion(
  goalId: string,
  userId: string,
  chatHistory: ChatMessage[],
): Promise<ActionResult<DynamicNextQuestionData>> {
  try {
    console.log('🚀 generateNextQuestion called with:', { goalId, userId, historyLength: chatHistory.length });
    
    // Validation
    if (!goalId || !userId) {
      console.error('❌ Validation failed: Missing goalId or userId');
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
    console.log('✅ Goal found:', goal.title);
    
    const runtimeContext = new RuntimeContext();

    // 対話の深さを分析
    console.log('🔍 Executing goalAnalysisTool...');
    const analysisResult = await goalAnalysisTool.execute({
      context: {
        goalId,
        userId,
        chatHistory,
      },
      runtimeContext,
    });
    console.log('📊 Analysis result:', analysisResult);

    // 次の質問を生成
    console.log('🤖 Executing generateQuestionTool...');
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
    console.log('❓ Question result:', questionResult);

    return {
      success: true,
      data: questionResult,
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
  goal: Goal,
): Promise<ActionResult<DynamicConversationAnalysis>> {
  try {
    const runtimeContext = new RuntimeContext();
    const result = await goalAnalysisTool.execute({
      context: {
        goalId: goal.id,
        userId: goal.userId,
        chatHistory,
      },
      runtimeContext,
    });

    return {
      success: true,
      data: result,
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
  goal: Goal,
): Promise<ActionResult<ConversationSummary>> {
  try {
    if (!chatHistory || chatHistory.length === 0) {
      return {
        success: false,
        error: 'Chat history is required',
      };
    }

    const runtimeContext = new RuntimeContext();
    const result = await analyzeChatHistoryTool.execute({
      context: {
        chatHistory,
      },
      runtimeContext,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error generating conversation summary:', error);
    return {
      success: false,
      error: 'Failed to generate conversation summary',
    };
  }
}
