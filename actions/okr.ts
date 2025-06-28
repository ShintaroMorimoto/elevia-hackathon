'use server';

import { db } from '@/lib/db';
import { yearlyOkrs, quarterlyOkrs, keyResults } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { NewYearlyOkr, YearlyOkr, NewQuarterlyOkr, QuarterlyOkr, NewKeyResult, KeyResult } from '@/lib/db/schema';

export type ActionResult<T = any> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export async function createYearlyOkr(okrData: NewYearlyOkr): Promise<ActionResult<YearlyOkr>> {
  try {
    // Validation
    if (!okrData.objective || okrData.objective.trim() === '') {
      return {
        success: false,
        error: 'Objective is required',
      };
    }

    if (!okrData.goalId || okrData.goalId.trim() === '') {
      return {
        success: false,
        error: 'Goal ID is required',
      };
    }

    if (!okrData.targetYear || okrData.targetYear < 2000 || okrData.targetYear > 2100) {
      return {
        success: false,
        error: 'Target year must be a valid year (2000-2100)',
      };
    }

    // Create yearly OKR
    const result = await db.insert(yearlyOkrs).values({
      ...okrData,
      progressPercentage: '0',
      sortOrder: okrData.sortOrder || 0,
    }).returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to create yearly OKR',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error('Error creating yearly OKR:', error);
    return {
      success: false,
      error: 'Failed to create yearly OKR',
    };
  }
}

export async function createQuarterlyOkr(okrData: NewQuarterlyOkr): Promise<ActionResult<QuarterlyOkr>> {
  try {
    // Validation
    if (!okrData.objective || okrData.objective.trim() === '') {
      return {
        success: false,
        error: 'Objective is required',
      };
    }

    if (!okrData.yearlyOkrId || okrData.yearlyOkrId.trim() === '') {
      return {
        success: false,
        error: 'Yearly OKR ID is required',
      };
    }

    if (!okrData.targetYear || okrData.targetYear < 2000 || okrData.targetYear > 2100) {
      return {
        success: false,
        error: 'Target year must be a valid year (2000-2100)',
      };
    }

    if (!okrData.targetQuarter || okrData.targetQuarter < 1 || okrData.targetQuarter > 4) {
      return {
        success: false,
        error: 'Target quarter must be between 1 and 4',
      };
    }

    // Create quarterly OKR
    const result = await db.insert(quarterlyOkrs).values({
      ...okrData,
      progressPercentage: '0',
      sortOrder: okrData.sortOrder || 0,
    }).returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to create quarterly OKR',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error('Error creating quarterly OKR:', error);
    return {
      success: false,
      error: 'Failed to create quarterly OKR',
    };
  }
}

export async function createKeyResult(krData: NewKeyResult): Promise<ActionResult<KeyResult>> {
  try {
    // Validation
    if (!krData.description || krData.description.trim() === '') {
      return {
        success: false,
        error: 'Description is required',
      };
    }

    if (!krData.targetValue || krData.targetValue.trim() === '') {
      return {
        success: false,
        error: 'Target value is required',
      };
    }

    // Must be associated with either yearly or quarterly OKR, but not both
    if (!krData.yearlyOkrId && !krData.quarterlyOkrId) {
      return {
        success: false,
        error: 'Key result must be associated with either yearly or quarterly OKR',
      };
    }

    if (krData.yearlyOkrId && krData.quarterlyOkrId) {
      return {
        success: false,
        error: 'Key result cannot be associated with both yearly and quarterly OKR',
      };
    }

    // Create key result
    const result = await db.insert(keyResults).values({
      ...krData,
      currentValue: krData.currentValue || '0',
      achievementRate: '0',
      sortOrder: krData.sortOrder || 0,
    }).returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to create key result',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error('Error creating key result:', error);
    return {
      success: false,
      error: 'Failed to create key result',
    };
  }
}

export async function getOkrsByGoal(goalId: string): Promise<ActionResult<YearlyOkr[]>> {
  try {
    if (!goalId || goalId.trim() === '') {
      return {
        success: false,
        error: 'Goal ID is required',
      };
    }

    const result = await db
      .select()
      .from(yearlyOkrs)
      .where(eq(yearlyOkrs.goalId, goalId))
      .orderBy(yearlyOkrs.sortOrder, yearlyOkrs.targetYear);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error fetching OKRs by goal:', error);
    return {
      success: false,
      error: 'Failed to fetch OKRs',
    };
  }
}

export async function updateYearlyOkr(
  okrId: string,
  updateData: Partial<NewYearlyOkr>
): Promise<ActionResult<YearlyOkr>> {
  try {
    if (!okrId || okrId.trim() === '') {
      return {
        success: false,
        error: 'OKR ID is required',
      };
    }

    // Validate objective if provided
    if (updateData.objective !== undefined && updateData.objective.trim() === '') {
      return {
        success: false,
        error: 'Objective cannot be empty',
      };
    }

    // Validate target year if provided
    if (updateData.targetYear !== undefined && (updateData.targetYear < 2000 || updateData.targetYear > 2100)) {
      return {
        success: false,
        error: 'Target year must be a valid year (2000-2100)',
      };
    }

    // First check if OKR exists
    const existingOkr = await db
      .select()
      .from(yearlyOkrs)
      .where(eq(yearlyOkrs.id, okrId))
      .limit(1);

    if (existingOkr.length === 0) {
      return {
        success: false,
        error: 'Yearly OKR not found',
      };
    }

    // Update OKR
    const result = await db
      .update(yearlyOkrs)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(yearlyOkrs.id, okrId))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to update yearly OKR',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error('Error updating yearly OKR:', error);
    return {
      success: false,
      error: 'Failed to update yearly OKR',
    };
  }
}

export async function updateQuarterlyOkr(
  okrId: string,
  updateData: Partial<NewQuarterlyOkr>
): Promise<ActionResult<QuarterlyOkr>> {
  try {
    if (!okrId || okrId.trim() === '') {
      return {
        success: false,
        error: 'OKR ID is required',
      };
    }

    // Validate objective if provided
    if (updateData.objective !== undefined && updateData.objective.trim() === '') {
      return {
        success: false,
        error: 'Objective cannot be empty',
      };
    }

    // Validate target quarter if provided
    if (updateData.targetQuarter !== undefined && (updateData.targetQuarter < 1 || updateData.targetQuarter > 4)) {
      return {
        success: false,
        error: 'Target quarter must be between 1 and 4',
      };
    }

    // First check if OKR exists
    const existingOkr = await db
      .select()
      .from(quarterlyOkrs)
      .where(eq(quarterlyOkrs.id, okrId))
      .limit(1);

    if (existingOkr.length === 0) {
      return {
        success: false,
        error: 'Quarterly OKR not found',
      };
    }

    // Update OKR
    const result = await db
      .update(quarterlyOkrs)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(quarterlyOkrs.id, okrId))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to update quarterly OKR',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error('Error updating quarterly OKR:', error);
    return {
      success: false,
      error: 'Failed to update quarterly OKR',
    };
  }
}

export async function updateKeyResult(
  krId: string,
  updateData: Partial<NewKeyResult>
): Promise<ActionResult<KeyResult>> {
  try {
    if (!krId || krId.trim() === '') {
      return {
        success: false,
        error: 'Key Result ID is required',
      };
    }

    // Validate description if provided
    if (updateData.description !== undefined && updateData.description.trim() === '') {
      return {
        success: false,
        error: 'Description cannot be empty',
      };
    }

    // First check if Key Result exists
    const existingKr = await db
      .select()
      .from(keyResults)
      .where(eq(keyResults.id, krId))
      .limit(1);

    if (existingKr.length === 0) {
      return {
        success: false,
        error: 'Key Result not found',
      };
    }

    // Calculate achievement rate if current value is being updated
    let achievementRate = updateData.currentValue ? undefined : updateData.achievementRate;
    if (updateData.currentValue !== undefined && updateData.targetValue !== undefined) {
      const current = parseFloat(updateData.currentValue || '0');
      const target = parseFloat(updateData.targetValue || '0');
      if (!isNaN(current) && !isNaN(target) && target > 0) {
        achievementRate = ((current / target) * 100).toFixed(2);
      }
    }

    // Update Key Result
    const result = await db
      .update(keyResults)
      .set({
        ...updateData,
        achievementRate,
        updatedAt: new Date(),
      })
      .where(eq(keyResults.id, krId))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to update key result',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    console.error('Error updating key result:', error);
    return {
      success: false,
      error: 'Failed to update key result',
    };
  }
}

export async function deleteYearlyOkr(okrId: string): Promise<ActionResult<undefined>> {
  try {
    if (!okrId || okrId.trim() === '') {
      return {
        success: false,
        error: 'OKR ID is required',
      };
    }

    // First check if OKR exists
    const existingOkr = await db
      .select()
      .from(yearlyOkrs)
      .where(eq(yearlyOkrs.id, okrId))
      .limit(1);

    if (existingOkr.length === 0) {
      return {
        success: false,
        error: 'Yearly OKR not found',
      };
    }

    // Delete OKR (cascading deletes will handle related records)
    await db
      .delete(yearlyOkrs)
      .where(eq(yearlyOkrs.id, okrId));

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Error deleting yearly OKR:', error);
    return {
      success: false,
      error: 'Failed to delete yearly OKR',
    };
  }
}

export async function deleteQuarterlyOkr(okrId: string): Promise<ActionResult<undefined>> {
  try {
    if (!okrId || okrId.trim() === '') {
      return {
        success: false,
        error: 'OKR ID is required',
      };
    }

    // First check if OKR exists
    const existingOkr = await db
      .select()
      .from(quarterlyOkrs)
      .where(eq(quarterlyOkrs.id, okrId))
      .limit(1);

    if (existingOkr.length === 0) {
      return {
        success: false,
        error: 'Quarterly OKR not found',
      };
    }

    // Delete OKR (cascading deletes will handle related records)
    await db
      .delete(quarterlyOkrs)
      .where(eq(quarterlyOkrs.id, okrId));

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Error deleting quarterly OKR:', error);
    return {
      success: false,
      error: 'Failed to delete quarterly OKR',
    };
  }
}

export async function deleteKeyResult(krId: string): Promise<ActionResult<undefined>> {
  try {
    if (!krId || krId.trim() === '') {
      return {
        success: false,
        error: 'Key Result ID is required',
      };
    }

    // First check if Key Result exists
    const existingKr = await db
      .select()
      .from(keyResults)
      .where(eq(keyResults.id, krId))
      .limit(1);

    if (existingKr.length === 0) {
      return {
        success: false,
        error: 'Key Result not found',
      };
    }

    // Delete Key Result
    await db
      .delete(keyResults)
      .where(eq(keyResults.id, krId));

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error('Error deleting key result:', error);
    return {
      success: false,
      error: 'Failed to delete key result',
    };
  }
}

export async function getYearlyOKRs(goalId: string): Promise<ActionResult<YearlyOkr[]>> {
  try {
    if (!goalId || goalId.trim() === '') {
      return {
        success: false,
        error: 'Goal ID is required',
      };
    }

    const result = await db
      .select()
      .from(yearlyOkrs)
      .where(eq(yearlyOkrs.goalId, goalId))
      .orderBy(yearlyOkrs.targetYear, yearlyOkrs.sortOrder);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error fetching yearly OKRs:', error);
    return {
      success: false,
      error: 'Failed to fetch yearly OKRs',
    };
  }
}

export async function getQuarterlyOKRs(goalId: string): Promise<ActionResult<QuarterlyOkr[]>> {
  try {
    if (!goalId || goalId.trim() === '') {
      return {
        success: false,
        error: 'Goal ID is required',
      };
    }

    // Get quarterly OKRs by joining with yearly OKRs to filter by goal
    const result = await db
      .select({
        id: quarterlyOkrs.id,
        yearlyOkrId: quarterlyOkrs.yearlyOkrId,
        objective: quarterlyOkrs.objective,
        targetYear: quarterlyOkrs.targetYear,
        targetQuarter: quarterlyOkrs.targetQuarter,
        progressPercentage: quarterlyOkrs.progressPercentage,
        sortOrder: quarterlyOkrs.sortOrder,
        createdAt: quarterlyOkrs.createdAt,
        updatedAt: quarterlyOkrs.updatedAt,
      })
      .from(quarterlyOkrs)
      .innerJoin(yearlyOkrs, eq(quarterlyOkrs.yearlyOkrId, yearlyOkrs.id))
      .where(eq(yearlyOkrs.goalId, goalId))
      .orderBy(quarterlyOkrs.targetYear, quarterlyOkrs.targetQuarter, quarterlyOkrs.sortOrder);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error fetching quarterly OKRs:', error);
    return {
      success: false,
      error: 'Failed to fetch quarterly OKRs',
    };
  }
}

export async function getKeyResults(goalId: string): Promise<ActionResult<KeyResult[]>> {
  try {
    if (!goalId || goalId.trim() === '') {
      return {
        success: false,
        error: 'Goal ID is required',
      };
    }

    // Get key results by joining with both yearly and quarterly OKRs to filter by goal
    // We need to get key results from both yearly OKRs and quarterly OKRs
    
    // First, get key results from yearly OKRs
    const yearlyKeyResults = await db
      .select({
        id: keyResults.id,
        yearlyOkrId: keyResults.yearlyOkrId,
        quarterlyOkrId: keyResults.quarterlyOkrId,
        description: keyResults.description,
        targetValue: keyResults.targetValue,
        currentValue: keyResults.currentValue,
        unit: keyResults.unit,
        achievementRate: keyResults.achievementRate,
        sortOrder: keyResults.sortOrder,
        createdAt: keyResults.createdAt,
        updatedAt: keyResults.updatedAt,
      })
      .from(keyResults)
      .innerJoin(yearlyOkrs, eq(keyResults.yearlyOkrId, yearlyOkrs.id))
      .where(eq(yearlyOkrs.goalId, goalId));

    // Then, get key results from quarterly OKRs
    const quarterlyKeyResults = await db
      .select({
        id: keyResults.id,
        yearlyOkrId: keyResults.yearlyOkrId,
        quarterlyOkrId: keyResults.quarterlyOkrId,
        description: keyResults.description,
        targetValue: keyResults.targetValue,
        currentValue: keyResults.currentValue,
        unit: keyResults.unit,
        achievementRate: keyResults.achievementRate,
        sortOrder: keyResults.sortOrder,
        createdAt: keyResults.createdAt,
        updatedAt: keyResults.updatedAt,
      })
      .from(keyResults)
      .innerJoin(quarterlyOkrs, eq(keyResults.quarterlyOkrId, quarterlyOkrs.id))
      .innerJoin(yearlyOkrs, eq(quarterlyOkrs.yearlyOkrId, yearlyOkrs.id))
      .where(eq(yearlyOkrs.goalId, goalId));

    // Combine and sort all key results
    const result = [...yearlyKeyResults, ...quarterlyKeyResults]
      .sort((a, b) => a.sortOrder - b.sortOrder);


    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error fetching key results:', error);
    return {
      success: false,
      error: 'Failed to fetch key results',
    };
  }
}