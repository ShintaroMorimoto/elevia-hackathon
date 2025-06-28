import { z } from "zod";

// AI生成用の拡張スキーマ
export const aiGeneratedYearlyOKRSchema = z.object({
  year: z.number(),
  monthsInYear: z.number().min(1).max(12),
  startMonth: z.number().min(1).max(12),
  endMonth: z.number().min(1).max(12),
  isPartialYear: z.boolean(),
  objective: z.string(),
  rationale: z.string(), // なぜこの目標なのか
  keyMilestones: z.array(z.object({
    month: z.number().min(1).max(12),
    milestone: z.string(),
  })),
  keyResults: z.array(z.object({
    description: z.string(),
    targetValue: z.number(),
    unit: z.string(), // 単位（回、時間、％など）
    measurementMethod: z.string(), // 測定方法
    frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annually", "once"]),
    baselineValue: z.number().default(0),
  })),
  dependencies: z.array(z.string()), // 前年の成果に依存する項目
  riskFactors: z.array(z.string()), // リスク要因
});

export const aiOKRGenerationRequestSchema = z.object({
  goalTitle: z.string(),
  goalDescription: z.string(),
  totalPeriod: z.object({
    months: z.number(),
    years: z.number(),
  }),
  yearlyBreakdown: z.array(z.object({
    year: z.number(),
    monthsInYear: z.number(),
    startMonth: z.number(),
    endMonth: z.number(),
    isPartialYear: z.boolean(),
  })),
  chatInsights: z.object({
    motivation: z.string(),
    currentSkills: z.string(),
    availableResources: z.string(),
    constraints: z.string(),
    values: z.string(),
  }),
});

export const aiOKRGenerationResponseSchema = z.object({
  yearlyOKRs: z.array(aiGeneratedYearlyOKRSchema),
  overallStrategy: z.string(),
  successCriteria: z.string(),
  totalEstimatedEffort: z.string(), // 推定総工数
  keySuccessFactors: z.array(z.string()), // 成功要因
});

// 型定義をエクスポート
export type AIGeneratedYearlyOKR = z.infer<typeof aiGeneratedYearlyOKRSchema>;
export type AIOKRGenerationRequest = z.infer<typeof aiOKRGenerationRequestSchema>;
export type AIOKRGenerationResponse = z.infer<typeof aiOKRGenerationResponseSchema>;
