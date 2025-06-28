/**
 * Mastra統合用の共通型定義
 * 
 * @description UI、Server Actions、Mastraワークフロー間で使用される型を統一
 */

// ============================================
// チャット関連の型
// ============================================

/**
 * チャットメッセージの型定義
 */
export interface ChatMessage {
  role: string;
  content: string;
}

/**
 * 次の質問データの型定義（レガシー対応）
 */
export interface NextQuestionData {
  question: string;
  type: string;
  depth: number;
}

/**
 * AI駆動動的質問データの型定義
 */
export interface DynamicNextQuestionData extends NextQuestionData {
  reasoning: string;
  shouldComplete: boolean;
  confidence: number;
}

/**
 * 対話分析結果の型定義（レガシー対応）
 */
export interface ConversationAnalysis {
  currentDepth: number;
  maxDepth: number;
  isComplete: boolean;
  completionPercentage: number;
  missingAspects: string[];
}

/**
 * AI駆動動的対話分析結果の型定義
 */
export interface DynamicConversationAnalysis extends ConversationAnalysis {
  informationSufficiency: number;
  isReadyToProceed: boolean;
  missingCriticalInfo: string[];
  conversationQuality: 'low' | 'medium' | 'high';
  suggestedNextAction: 'continue_conversation' | 'proceed_to_planning' | 'clarify_goal';
  reasoning: string;
}

/**
 * 対話サマリーの型定義
 */
export interface ConversationSummary {
  userMotivation: string;
  keyInsights: string[];
  readinessLevel: number;
  recommendedActions: string[];
}

// ============================================
// OKR関連の型
// ============================================

/**
 * キーリザルトの型定義
 */
export interface KeyResult {
  description: string;
  targetValue: number;
  currentValue: number;
}

/**
 * 年次OKRの型定義
 */
export interface YearlyOKR {
  year: number;
  objective: string;
  keyResults: KeyResult[];
}

/**
 * 四半期OKRの型定義
 */
export interface QuarterlyOKR {
  year: number;
  quarter: number;
  objective: string;
  keyResults: KeyResult[];
}

/**
 * OKRプランの型定義
 */
export interface OKRPlan {
  yearly: YearlyOKR[];
  quarterly: QuarterlyOKR[];
}

/**
 * 生成されたプランの型定義
 */
export interface GeneratedPlan {
  success: boolean;
  planId: string;
  okrPlan: OKRPlan;
  analysis: {
    userMotivation: string;
    keyInsights: string[];
    readinessLevel: number;
    recommendedActions: string[];
    completionPercentage: number;
  };
}

// ============================================
// バリデーション関数
// ============================================

/**
 * ChatMessageのバリデーション
 */
export function validateChatMessage(message: ChatMessage): void {
  if (!message.role || typeof message.role !== 'string' || message.role.trim() === '') {
    throw new Error('ChatMessage: role is required and must be a non-empty string');
  }
  if (!message.content || typeof message.content !== 'string' || message.content.trim() === '') {
    throw new Error('ChatMessage: content is required and must be a non-empty string');
  }
}

/**
 * KeyResultのバリデーション
 */
export function validateKeyResult(keyResult: KeyResult): void {
  if (!keyResult.description || typeof keyResult.description !== 'string' || keyResult.description.trim() === '') {
    throw new Error('KeyResult: description is required and must be a non-empty string');
  }
  if (typeof keyResult.targetValue !== 'number' || keyResult.targetValue < 0) {
    throw new Error('KeyResult: targetValue must be a non-negative number');
  }
  if (typeof keyResult.currentValue !== 'number' || keyResult.currentValue < 0) {
    throw new Error('KeyResult: currentValue must be a non-negative number');
  }
}

/**
 * YearlyOKRのバリデーション
 */
export function validateYearlyOKR(yearlyOKR: YearlyOKR): void {
  if (typeof yearlyOKR.year !== 'number' || yearlyOKR.year < 2020 || yearlyOKR.year > 2100) {
    throw new Error('YearlyOKR: year must be a valid year between 2020 and 2100');
  }
  if (!yearlyOKR.objective || typeof yearlyOKR.objective !== 'string' || yearlyOKR.objective.trim() === '') {
    throw new Error('YearlyOKR: objective is required and must be a non-empty string');
  }
  if (!Array.isArray(yearlyOKR.keyResults) || yearlyOKR.keyResults.length === 0) {
    throw new Error('YearlyOKR: keyResults must be a non-empty array');
  }
  yearlyOKR.keyResults.forEach((kr, index) => {
    try {
      validateKeyResult(kr);
    } catch (error) {
      throw new Error(`YearlyOKR: keyResults[${index}] - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

/**
 * QuarterlyOKRのバリデーション
 */
export function validateQuarterlyOKR(quarterlyOKR: QuarterlyOKR): void {
  if (typeof quarterlyOKR.year !== 'number' || quarterlyOKR.year < 2020 || quarterlyOKR.year > 2100) {
    throw new Error('QuarterlyOKR: year must be a valid year between 2020 and 2100');
  }
  if (typeof quarterlyOKR.quarter !== 'number' || quarterlyOKR.quarter < 1 || quarterlyOKR.quarter > 4) {
    throw new Error('QuarterlyOKR: quarter must be between 1 and 4');
  }
  if (!quarterlyOKR.objective || typeof quarterlyOKR.objective !== 'string' || quarterlyOKR.objective.trim() === '') {
    throw new Error('QuarterlyOKR: objective is required and must be a non-empty string');
  }
  if (!Array.isArray(quarterlyOKR.keyResults) || quarterlyOKR.keyResults.length === 0) {
    throw new Error('QuarterlyOKR: keyResults must be a non-empty array');
  }
  quarterlyOKR.keyResults.forEach((kr, index) => {
    try {
      validateKeyResult(kr);
    } catch (error) {
      throw new Error(`QuarterlyOKR: keyResults[${index}] - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

/**
 * OKRPlanのバリデーション
 */
export function validateOKRPlan(okrPlan: OKRPlan): void {
  if (!Array.isArray(okrPlan.yearly)) {
    throw new Error('OKRPlan: yearly must be an array');
  }
  if (!Array.isArray(okrPlan.quarterly)) {
    throw new Error('OKRPlan: quarterly must be an array');
  }
  
  okrPlan.yearly.forEach((yearly, index) => {
    try {
      validateYearlyOKR(yearly);
    } catch (error) {
      throw new Error(`OKRPlan: yearly[${index}] - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  okrPlan.quarterly.forEach((quarterly, index) => {
    try {
      validateQuarterlyOKR(quarterly);
    } catch (error) {
      throw new Error(`OKRPlan: quarterly[${index}] - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

/**
 * GeneratedPlanのバリデーション
 */
export function validateGeneratedPlan(generatedPlan: GeneratedPlan): void {
  if (typeof generatedPlan.success !== 'boolean') {
    throw new Error('GeneratedPlan: success must be a boolean');
  }
  if (!generatedPlan.planId || typeof generatedPlan.planId !== 'string' || generatedPlan.planId.trim() === '') {
    throw new Error('GeneratedPlan: planId is required and must be a non-empty string');
  }
  
  try {
    validateOKRPlan(generatedPlan.okrPlan);
  } catch (error) {
    throw new Error(`GeneratedPlan: okrPlan - ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // analysis オブジェクトのバリデーション
  const { analysis } = generatedPlan;
  if (!analysis || typeof analysis !== 'object') {
    throw new Error('GeneratedPlan: analysis is required and must be an object');
  }
  
  if (!analysis.userMotivation || typeof analysis.userMotivation !== 'string') {
    throw new Error('GeneratedPlan: analysis.userMotivation is required and must be a string');
  }
  
  if (!Array.isArray(analysis.keyInsights)) {
    throw new Error('GeneratedPlan: analysis.keyInsights must be an array');
  }
  
  if (typeof analysis.readinessLevel !== 'number' || analysis.readinessLevel < 0 || analysis.readinessLevel > 10) {
    throw new Error('GeneratedPlan: analysis.readinessLevel must be a number between 0 and 10');
  }
  
  if (!Array.isArray(analysis.recommendedActions)) {
    throw new Error('GeneratedPlan: analysis.recommendedActions must be an array');
  }
  
  if (typeof analysis.completionPercentage !== 'number' || analysis.completionPercentage < 0 || analysis.completionPercentage > 100) {
    throw new Error('GeneratedPlan: analysis.completionPercentage must be a number between 0 and 100');
  }
}