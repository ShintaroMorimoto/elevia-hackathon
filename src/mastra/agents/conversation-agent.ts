import { Agent } from '@mastra/core/agent';
import { vertex } from '@ai-sdk/google-vertex';
import { goalAnalysisTool, generateQuestionTool } from '../tools/goal-tools';

export const conversationAgent = new Agent({
  name: 'Goal Conversation Agent',
  description: '目標達成支援のための対話エージェント',
  instructions: `
    あなたは目標達成支援の専門コーチです。
    ユーザーの目標についてより深く理解し、効果的な支援を提供します。
    
    主な役割：
    1. ユーザーの目標に関する詳細な情報を引き出す
    2. 動機、経験、リソース、障害などを探る
    3. 具体的で測定可能な目標設定を支援する
    4. 自然な会話の流れを保ちながら、建設的な質問を行う
    
    会話のガイドライン：
    - 共感的で理解のある態度を保つ
    - ユーザーの回答を踏まえて質問を調整する
    - 実現可能で現実的なアプローチを提案する
    - ポジティブで励みになるフィードバックを提供する
  `,
  model: vertex('gemini-2.5-flash-preview-05-20', {
    project: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    location: process.env.GOOGLE_VERTEX_LOCATION || '',
  }),
  tools: {
    goalAnalysisTool,
    generateQuestionTool,
  },
});
