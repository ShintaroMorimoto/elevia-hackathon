import { createTool } from '@mastra/core';
import { Agent } from '@mastra/core';
import { vertex } from '@ai-sdk/google-vertex';
import {
  aiOKRGenerationRequestSchema,
  aiOKRGenerationResponseSchema,
  type AIOKRGenerationRequest,
  type AIOKRGenerationResponse,
} from '../schemas/okr-schemas';
import {
  createOKRGenerationPrompt,
  createOKRValidationPrompt,
} from '../prompts/okr-generation-prompt';

/**
 * AI-powered dynamic OKR generation tool
 */
export const generateAIOKRTool = createTool({
  id: 'generate-ai-okr',
  description: 'AIによる動的な年次OKR生成',
  inputSchema: aiOKRGenerationRequestSchema,
  outputSchema: aiOKRGenerationResponseSchema,

  execute: async ({ context }) => {
    try {
      // Create generation prompt
      const prompt = createOKRGenerationPrompt(context);

      // Initialize AI agent for OKR generation
      const generationAgent = new Agent({
        name: 'OKR Generation Agent',
        model: vertex('gemini-2.0-flash-001'),
        instructions: `
あなたはOKR生成の専門家です。以下のルールに従ってください：
1. 必ず有効なJSONを返す
2. 全ての必須フィールドを含める
3. 現実的で測定可能な目標を設定
4. ユーザーの状況を考慮したパーソナライズ
5. 段階的で継続的な成長計画を作成
6. 【重要】各年につき1つのObjectiveのみ生成する
7. 【重要】同じ年（year）の重複したOKRは絶対に作成しない
8. 【重要】年の一意性を必ず保つ
9. 【重要】frequencyフィールドには必ず以下のいずれかのみ使用: "daily", "weekly", "monthly", "quarterly", "annually", "once"
10. 【重要】"annual"や"yearly"は使用せず、必ず"annually"を使用する
        `,
      });

      // Generate initial OKR
      const response = await generationAgent.generate(prompt);

      // Parse and validate the response
      let parsedResponse: AIOKRGenerationResponse;
      try {
        const jsonContent = response.text
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '');
        parsedResponse = JSON.parse(jsonContent);
      } catch (parseError) {
        throw new Error(`Failed to parse AI response: ${parseError}`);
      }

      // Validate with schema and provide better error logging for frequency issues
      let validatedResponse: AIOKRGenerationResponse;
      try {
        validatedResponse = aiOKRGenerationResponseSchema.parse(parsedResponse);
      } catch (validationError) {
        // Check if the error is related to frequency enum
        if (
          validationError instanceof Error &&
          validationError.message.includes('frequency')
        ) {
          console.error(
            'Frequency validation error detected:',
            validationError.message,
          );
          console.error(
            'Parsed response with invalid frequency values:',
            JSON.stringify(parsedResponse, null, 2),
          );

          // Attempt to fix frequency values
          if (parsedResponse.yearlyOKRs) {
            parsedResponse.yearlyOKRs.forEach((yearly: any) => {
              if (yearly.keyResults) {
                yearly.keyResults.forEach((kr: any) => {
                  if (kr.frequency === 'annual' || kr.frequency === 'yearly') {
                    console.warn(
                      `Fixing invalid frequency value: ${kr.frequency} -> annually`,
                    );
                    kr.frequency = 'annually';
                  }
                });
              }
            });
          }

          // Try validation again after fixes
          validatedResponse =
            aiOKRGenerationResponseSchema.parse(parsedResponse);
        } else {
          throw validationError;
        }
      }

      // Validate numeric constraints for database compatibility
      validatedResponse.yearlyOKRs.forEach((yearly) => {
        yearly.keyResults.forEach((kr) => {
          if (kr.targetValue > 99999999) {
            console.warn(
              `Warning: targetValue ${kr.targetValue} exceeds database limit, capping at 99999999`,
            );
            kr.targetValue = 99999999;
          }
          if (kr.baselineValue && kr.baselineValue > 99999999) {
            console.warn(
              `Warning: baselineValue ${kr.baselineValue} exceeds database limit, capping at 99999999`,
            );
            kr.baselineValue = 99999999;
          }
        });
      });

      // Optional: Secondary validation with another AI call
      const validationPrompt = createOKRValidationPrompt(validatedResponse);
      const validationAgent = new Agent({
        name: 'OKR Validation Agent',
        model: vertex('gemini-2.0-flash-001'),
        instructions:
          'OKRプランの品質を評価し、必要に応じて改善案を提示する専門家',
      });

      const validationResponse =
        await validationAgent.generate(validationPrompt);

      // If validation suggests improvements, apply them
      if (validationResponse.text !== 'APPROVED') {
        try {
          const improvedResponse = JSON.parse(
            validationResponse.text
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, ''),
          );

          // Check for year duplicates in improved response
          const years =
            improvedResponse.yearlyOKRs?.map((okr: any) => okr.year) || [];
          const uniqueYears = new Set(years);

          if (years.length !== uniqueYears.size) {
            // Year duplicates detected, fall back to original response
            console.warn(
              '年の重複が検出されたため、改善版を採用せず元の結果を返します',
            );
            console.warn(
              '重複した年:',
              years.filter(
                (year: number, index: number) => years.indexOf(year) !== index,
              ),
            );
            return validatedResponse;
          }

          // No duplicates, use improved response
          return aiOKRGenerationResponseSchema.parse(improvedResponse);
        } catch (parseError) {
          // If validation parsing fails, return original validated response
          console.warn(
            '改善版のパースに失敗したため、元の結果を返します:',
            parseError,
          );
          return validatedResponse;
        }
      }

      return validatedResponse;
    } catch (error) {
      console.error('Error in generateAIOKRTool:', error);
      throw new Error(
        `AI OKR generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },
});
