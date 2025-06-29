// Plan detail helpers for database integration
// TDD Green phase - minimal implementation to make tests pass

import { getGoal } from '@/actions/goals';
import {
  getYearlyOKRs,
  getQuarterlyOKRs,
  getKeyResults,
  updateYearlyOkr,
  updateQuarterlyOkr,
  updateKeyResult,
} from '@/actions/okr';

export interface PlanData {
  goal: {
    id: string;
    title: string;
    deadline: string;
    userId: string;
  };
  yearlyOKRs: Array<{
    id: string;
    year: number;
    objective: string;
    description: string;
    progressPercentage: number;
    quarterlyOKRs: Array<{
      id: string;
      quarter: number;
      objective: string;
      description: string;
      progressPercentage: number;
      keyResults: Array<{
        id: string;
        result: string;
        targetValue: number;
        currentValue: number;
        unit?: string;
      }>;
    }>;
    keyResults: Array<{
      id: string;
      result: string;
      targetValue: number;
      currentValue: number;
      unit?: string;
    }>;
  }>;
  totalProgress: number;
}

export interface ProgressUpdateResult {
  success: boolean;
  progress: number;
  data: {
    id: string;
    currentValue: number;
  };
}

export interface CompletionToggleResult {
  success: boolean;
  newStatus: boolean;
  data: {
    id: string;
    progressPercentage: string;
  };
}

export async function loadPlanData(
  goalId: string,
  _userId: string,
): Promise<PlanData> {
  try {
    console.log('🔍 DEBUG: Starting loadPlanData', { goalId, userId: _userId });

    // Get goal data
    const goalResult = await getGoal(goalId, _userId);
    if (!goalResult.success) {
      console.error('❌ DEBUG: Failed to load goal:', goalResult.error);
      throw new Error('Goal not found');
    }
    console.log('✅ DEBUG: Goal loaded successfully:', goalResult.data.title);

    // Get yearly OKRs
    const yearlyOKRsResult = await getYearlyOKRs(goalId);
    if (!yearlyOKRsResult.success) {
      console.error(
        '❌ DEBUG: Failed to load yearly OKRs:',
        yearlyOKRsResult.error,
      );
      throw new Error('Failed to load yearly OKRs');
    }
    console.log('✅ DEBUG: Yearly OKRs loaded:', yearlyOKRsResult.data.length);

    // Get quarterly OKRs for all yearly OKRs
    const quarterlyOKRsResult = await getQuarterlyOKRs(goalId);
    if (!quarterlyOKRsResult.success) {
      console.error(
        '❌ DEBUG: Failed to load quarterly OKRs:',
        quarterlyOKRsResult.error,
      );
      throw new Error('Failed to load quarterly OKRs');
    }
    console.log(
      '✅ DEBUG: Quarterly OKRs loaded:',
      quarterlyOKRsResult.data.length,
    );

    // Get all key results
    const keyResultsResult = await getKeyResults(goalId);
    if (!keyResultsResult.success) {
      console.error(
        '❌ DEBUG: Failed to load key results:',
        keyResultsResult.error,
      );
      throw new Error('Failed to load key results');
    }
    console.log('✅ DEBUG: Key results loaded:', keyResultsResult.data.length);

    const quarterlyOKRs = quarterlyOKRsResult.data;
    const allKeyResults = keyResultsResult.data;

    // 🔍 DEBUG: Log raw key results data from database
    console.log('🔍 DEBUG: Raw key results from database:', {
      totalCount: allKeyResults.length,
      sampleKeyResults: allKeyResults.slice(0, 3).map((kr) => ({
        id: kr.id,
        description: kr.description,
        unit: kr.unit,
        hasUnit: !!kr.unit,
        targetValue: kr.targetValue,
        currentValue: kr.currentValue,
        yearlyOkrId: kr.yearlyOkrId,
        quarterlyOkrId: kr.quarterlyOkrId,
      })),
    });

    // Organize the data structure
    const organizedYearlyOKRs = yearlyOKRsResult.data.map((yearlyOKR) => {
      // Get quarterly OKRs for this yearly OKR
      const relatedQuarterlyOKRs = quarterlyOKRs
        .filter((q) => q.yearlyOkrId === yearlyOKR.id)
        .map((quarterlyOKR) => {
          // Get key results for this quarterly OKR
          const quarterlyKeyResults = allKeyResults
            .filter((kr) => kr.quarterlyOkrId === quarterlyOKR.id)
            .map((kr) => ({
              id: kr.id,
              result: kr.description,
              targetValue: parseFloat(kr.targetValue),
              currentValue: parseFloat(kr.currentValue || '0'),
              unit: kr.unit || undefined,
            }));

          // 🔍 DEBUG: Log quarterly key results mapping
          if (quarterlyKeyResults.length > 0) {
            console.log(
              `🔍 DEBUG: Quarterly OKR ${quarterlyOKR.id} (Q${quarterlyOKR.targetQuarter}) key results:`,
              {
                count: quarterlyKeyResults.length,
                keyResults: quarterlyKeyResults.map((kr) => ({
                  id: kr.id,
                  result: kr.result,
                  unit: kr.unit,
                  hasUnit: !!kr.unit,
                  rawUnit: allKeyResults.find((raw) => raw.id === kr.id)?.unit,
                })),
              },
            );
          }

          // Calculate progress from key results
          let calculatedProgress = 0;
          if (quarterlyKeyResults.length > 0) {
            const totalProgress = quarterlyKeyResults.reduce((sum, kr) => {
              return (
                sum + Math.min(100, (kr.currentValue / kr.targetValue) * 100)
              );
            }, 0);
            calculatedProgress = Math.round(
              totalProgress / quarterlyKeyResults.length,
            );
          }

          return {
            id: quarterlyOKR.id,
            quarter: quarterlyOKR.targetQuarter,
            objective: quarterlyOKR.objective,
            description: quarterlyOKR.objective, // Using objective as description
            progressPercentage: calculatedProgress,
            keyResults: quarterlyKeyResults,
          };
        });

      // Get key results directly associated with this yearly OKR
      const yearlyKeyResults = allKeyResults
        .filter(
          (kr) => kr.yearlyOkrId === yearlyOKR.id && kr.quarterlyOkrId === null,
        )
        .map((kr) => ({
          id: kr.id,
          result: kr.description,
          targetValue: parseFloat(kr.targetValue),
          currentValue: parseFloat(kr.currentValue || '0'),
          unit: kr.unit || undefined,
        }));

      // 🔍 DEBUG: Log yearly key results mapping
      if (yearlyKeyResults.length > 0) {
        console.log(
          `🔍 DEBUG: Yearly OKR ${yearlyOKR.id} (${yearlyOKR.targetYear}) key results:`,
          {
            count: yearlyKeyResults.length,
            keyResults: yearlyKeyResults.map((kr) => ({
              id: kr.id,
              result: kr.result,
              unit: kr.unit,
              hasUnit: !!kr.unit,
              rawUnit: allKeyResults.find((raw) => raw.id === kr.id)?.unit,
            })),
          },
        );
      }

      // Calculate yearly progress from both yearly key results and quarterly OKRs
      let yearlyProgress = 0;
      let progressComponents = 0;

      // Add yearly key results progress
      if (yearlyKeyResults.length > 0) {
        const yearlyKRProgress = yearlyKeyResults.reduce((sum, kr) => {
          return sum + Math.min(100, (kr.currentValue / kr.targetValue) * 100);
        }, 0);
        yearlyProgress += yearlyKRProgress / yearlyKeyResults.length;
        progressComponents += 1;
      }

      // Add quarterly OKRs progress
      if (relatedQuarterlyOKRs.length > 0) {
        const quarterlyProgress = relatedQuarterlyOKRs.reduce((sum, qOKR) => {
          return sum + qOKR.progressPercentage;
        }, 0);
        yearlyProgress += quarterlyProgress / relatedQuarterlyOKRs.length;
        progressComponents += 1;
      }

      // Calculate final progress
      const finalYearlyProgress =
        progressComponents > 0
          ? Math.round(yearlyProgress / progressComponents)
          : 0;

      return {
        id: yearlyOKR.id,
        year: yearlyOKR.targetYear,
        objective: yearlyOKR.objective,
        description: yearlyOKR.objective, // Using objective as description
        progressPercentage: finalYearlyProgress,
        quarterlyOKRs: relatedQuarterlyOKRs,
        keyResults: yearlyKeyResults,
      };
    });

    // Calculate total progress from yearly OKRs
    let totalProgress = 0;
    if (organizedYearlyOKRs.length > 0) {
      const totalYearlyProgress = organizedYearlyOKRs.reduce(
        (sum, yearlyOKR) => {
          return sum + yearlyOKR.progressPercentage;
        },
        0,
      );
      totalProgress = Math.round(
        totalYearlyProgress / organizedYearlyOKRs.length,
      );
    }

    // 🔍 DEBUG: Log final organized data structure
    console.log('🔍 DEBUG: Final organized data structure:', {
      goalId: goalResult.data.id,
      goalTitle: goalResult.data.title,
      totalYearlyOKRs: organizedYearlyOKRs.length,
      totalProgress,
      yearlyOKRsWithUnits: organizedYearlyOKRs.map((yearlyOKR) => ({
        year: yearlyOKR.year,
        yearlyKeyResultsWithUnits: yearlyOKR.keyResults.filter(
          (kr) => !!kr.unit,
        ).length,
        quarterlyOKRsWithUnits: yearlyOKR.quarterlyOKRs.map((qOKR) => ({
          quarter: qOKR.quarter,
          keyResultsWithUnits: qOKR.keyResults.filter((kr) => !!kr.unit).length,
          totalKeyResults: qOKR.keyResults.length,
        })),
      })),
    });

    return {
      goal: {
        id: goalResult.data.id,
        title: goalResult.data.title,
        deadline: goalResult.data.dueDate,
        userId: goalResult.data.userId,
      },
      yearlyOKRs: organizedYearlyOKRs,
      totalProgress,
    };
  } catch (error) {
    console.error('❌ DEBUG: Critical error in loadPlanData:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      goalId,
      userId: _userId,
    });

    // Re-throw the error with additional context
    throw new Error(
      `Failed to load plan data for goal ${goalId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// New function to calculate goal progress for dashboard
export async function calculateGoalProgress(
  goalId: string,
  userId: string,
): Promise<number> {
  try {
    const planData = await loadPlanData(goalId, userId);
    return planData.totalProgress;
  } catch (error) {
    console.error('Error calculating goal progress:', error);
    return 0;
  }
}

export async function updateOKRProgress(
  keyResultId: string,
  newCurrentValue: number,
  targetValue: number,
  newTargetValue?: number,
): Promise<ProgressUpdateResult> {
  const updateData: any = {
    currentValue: newCurrentValue.toString(),
  };

  if (newTargetValue !== undefined) {
    updateData.targetValue = newTargetValue.toString();
  }

  const updateResult = await updateKeyResult(keyResultId, updateData);

  if (!updateResult.success) {
    throw new Error('Database update failed');
  }

  const finalTargetValue =
    newTargetValue !== undefined ? newTargetValue : targetValue;
  const progress = Math.min(100, (newCurrentValue / finalTargetValue) * 100);

  return {
    success: true,
    progress: Math.round(progress),
    data: {
      id: updateResult.data.id,
      currentValue: parseFloat(updateResult.data.currentValue || '0'),
    },
  };
}

export async function toggleOKRCompletion(
  okrId: string,
  currentStatus: boolean,
  okrType: 'yearly' | 'quarterly',
): Promise<CompletionToggleResult> {
  const newStatus = !currentStatus;
  // Use progressPercentage to indicate completion (100% = completed, 0% = not completed)
  const progressPercentage = newStatus ? '100.00' : '0.00';

  let updateResult: { success: boolean; data?: any; error?: string };

  if (okrType === 'yearly') {
    updateResult = await updateYearlyOkr(okrId, {
      progressPercentage,
    });
  } else if (okrType === 'quarterly') {
    updateResult = await updateQuarterlyOkr(okrId, {
      progressPercentage,
    });
  } else {
    throw new Error('Invalid OKR type');
  }

  if (!updateResult.success) {
    throw new Error('Failed to update OKR completion status');
  }

  return {
    success: true,
    newStatus,
    data: updateResult.data || {},
  };
}
