import { createTool } from "@mastra/core";
import { Agent } from "@mastra/core";
import { vertex } from "@ai-sdk/google-vertex";
import { 
  aiOKRGenerationRequestSchema, 
  aiOKRGenerationResponseSchema,
  type AIOKRGenerationRequest,
  type AIOKRGenerationResponse
} from "../schemas/okr-schemas";
import { createOKRGenerationPrompt, createOKRValidationPrompt } from "../prompts/okr-generation-prompt";

/**
 * AI-powered dynamic OKR generation tool
 */
export const generateAIOKRTool = createTool({
  id: "generate-ai-okr",
  description: "AIによる動的な年次OKR生成",
  inputSchema: aiOKRGenerationRequestSchema,
  outputSchema: aiOKRGenerationResponseSchema,
  
  execute: async ({ context }) => {
    try {
      // Create generation prompt
      const prompt = createOKRGenerationPrompt(context);
      
      // Initialize AI agent for OKR generation
      const generationAgent = new Agent({
        name: "OKR Generation Agent",
        model: vertex("gemini-2.0-flash-001"),
        instructions: `
あなたはOKR生成の専門家です。以下のルールに従ってください：
1. 必ず有効なJSONを返す
2. 全ての必須フィールドを含める
3. 現実的で測定可能な目標を設定
4. ユーザーの状況を考慮したパーソナライズ
5. 段階的で継続的な成長計画を作成
        `,
      });
      
      // Generate initial OKR
      const response = await generationAgent.generate(prompt);
      
      // Parse and validate the response
      let parsedResponse: AIOKRGenerationResponse;
      try {
        const jsonContent = response.text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        parsedResponse = JSON.parse(jsonContent);
      } catch (parseError) {
        throw new Error(`Failed to parse AI response: ${parseError}`);
      }
      
      // Validate with schema
      const validatedResponse = aiOKRGenerationResponseSchema.parse(parsedResponse);
      
      // Validate numeric constraints for database compatibility
      validatedResponse.yearlyOKRs.forEach(yearly => {
        yearly.keyResults.forEach(kr => {
          if (kr.targetValue > 99999999) {
            console.warn(`Warning: targetValue ${kr.targetValue} exceeds database limit, capping at 99999999`);
            kr.targetValue = 99999999;
          }
          if (kr.baselineValue && kr.baselineValue > 99999999) {
            console.warn(`Warning: baselineValue ${kr.baselineValue} exceeds database limit, capping at 99999999`);
            kr.baselineValue = 99999999;
          }
        });
      });
      
      // Optional: Secondary validation with another AI call
      const validationPrompt = createOKRValidationPrompt(validatedResponse);
      const validationAgent = new Agent({
        name: "OKR Validation Agent",
        model: vertex("gemini-2.0-flash-001"),
        instructions: "OKRプランの品質を評価し、必要に応じて改善案を提示する専門家",
      });
      
      const validationResponse = await validationAgent.generate(validationPrompt);
      
      // If validation suggests improvements, apply them
      if (validationResponse.text !== "APPROVED") {
        try {
          const improvedResponse = JSON.parse(
            validationResponse.text.replace(/```json\n?/g, "").replace(/```\n?/g, "")
          );
          return aiOKRGenerationResponseSchema.parse(improvedResponse);
        } catch {
          // If validation parsing fails, return original validated response
          return validatedResponse;
        }
      }
      
      return validatedResponse;
      
    } catch (error) {
      console.error("Error in generateAIOKRTool:", error);
      throw new Error(`AI OKR generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});
