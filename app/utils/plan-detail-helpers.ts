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
      }>;
    }>;
    keyResults: Array<{
      id: string;
      result: string;
      targetValue: number;
      currentValue: number;
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
  // Get goal data
  const goalResult = await getGoal(goalId, _userId);
  if (!goalResult.success) {
    throw new Error('Goal not found');
  }

  // Get yearly OKRs
  const yearlyOKRsResult = await getYearlyOKRs(goalId);
  if (!yearlyOKRsResult.success) {
    throw new Error('Failed to load yearly OKRs');
  }

  // Get quarterly OKRs for all yearly OKRs
  const quarterlyOKRsResult = await getQuarterlyOKRs(goalId);
  if (!quarterlyOKRsResult.success) {
    throw new Error('Failed to load quarterly OKRs');
  }

  // Get all key results
  const keyResultsResult = await getKeyResults(goalId);
  if (!keyResultsResult.success) {
    throw new Error('Failed to load key results');
  }

  const quarterlyOKRs = quarterlyOKRsResult.data;
  const allKeyResults = keyResultsResult.data;

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
          }));

        // Calculate progress from key results
        let calculatedProgress = 0;
        if (quarterlyKeyResults.length > 0) {
          const totalProgress = quarterlyKeyResults.reduce((sum, kr) => {
            return sum + Math.min(100, (kr.currentValue / kr.targetValue) * 100);
          }, 0);
          calculatedProgress = Math.round(totalProgress / quarterlyKeyResults.length);
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
      }));

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
    const finalYearlyProgress = progressComponents > 0 
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
    const totalYearlyProgress = organizedYearlyOKRs.reduce((sum, yearlyOKR) => {
      return sum + yearlyOKR.progressPercentage;
    }, 0);
    totalProgress = Math.round(totalYearlyProgress / organizedYearlyOKRs.length);
  }

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

  const finalTargetValue = newTargetValue !== undefined ? newTargetValue : targetValue;
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
