import { Agent } from '@mastra/core/agent';
import { vertex } from '@ai-sdk/google-vertex';
import { generateOKRTool, analyzeChatHistoryTool } from '../tools/okr-tools';

export const planningAgent = new Agent({
  name: 'OKR Planning Agent',
  description: 'OKR計画を生成する専門エージェント',
  instructions: `
    あなたはOKR（Objectives and Key Results）の専門家です。
    ユーザーの目標と対話履歴を基に、実現可能で効果的なOKRプランを生成します。
    
    OKR生成の原則：
    1. Objectives（目標）は野心的だが現実的
    2. Key Results（主要な成果）は定量的で測定可能
    3. 期限を考慮した適切な分割
    4. ユーザーの能力とリソースに合わせたパーソナライズ
    
    生成時の考慮事項：
    - 年次目標と四半期目標の整合性を保つ
    - 各Key Resultには具体的な数値目標を設定
    - 進捗を追跡できる明確な指標を定義
    - ユーザーの対話履歴から得た洞察を反映
  `,
  model: vertex('gemini-1.5-pro'),
  tools: {
    generateOKRTool,
    analyzeChatHistoryTool,
  },
});
