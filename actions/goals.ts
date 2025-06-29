'use server';

import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { NewGoal, Goal } from '@/lib/db/schema';
import { calculateGoalProgress } from '@/app/utils/plan-detail-helpers';
import { requireAuthentication } from '@/lib/auth';

export type ActionResult<T = any> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

export async function createGoal(
  goalData: NewGoal,
): Promise<ActionResult<Goal>> {
  try {
    // Authentication check
    const user = await requireAuthentication();

    // Authorization check
    if (goalData.userId !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: Cannot create goal for different user',
      };
    }

    // Validation
    if (!goalData.title || goalData.title.trim() === '') {
      return {
        success: false,
        error: 'Title is required',
      };
    }

    if (!goalData.userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    if (!goalData.dueDate) {
      return {
        success: false,
        error: 'Due date is required',
      };
    }

    // Validate minimum 5-year deadline
    const dueDate = new Date(goalData.dueDate);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() + 5);

    if (dueDate < minDate) {
      return {
        success: false,
        error: '目標期限は最低5年後に設定してください',
      };
    }

    // Create goal
    const result = await db
      .insert(goals)
      .values({
        ...goalData,
        status: goalData.status || 'active',
        progressPercentage: '0',
      })
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to create goal',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    // Re-throw authentication errors to allow proper error handling
    if (error instanceof Error && error.name === 'AuthenticationError') {
      throw error;
    }
    console.error('Error creating goal:', error);
    return {
      success: false,
      error: 'Failed to create goal',
    };
  }
}

export async function getGoals(userId: string): Promise<ActionResult<Goal[]>> {
  try {
    // Authentication check
    const user = await requireAuthentication();

    // Authorization check
    if (userId !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: Cannot access goals for different user',
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    const result = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(goals.createdAt);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // Re-throw authentication errors to allow proper error handling
    if (error instanceof Error && error.name === 'AuthenticationError') {
      throw error;
    }
    console.error('Error fetching goals:', error);
    return {
      success: false,
      error: 'Failed to fetch goals',
    };
  }
}

export async function getGoalsWithProgress(
  userId: string,
): Promise<ActionResult<Goal[]>> {
  try {
    // Authentication check
    const user = await requireAuthentication();

    // Authorization check
    if (userId !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: Cannot access goals for different user',
      };
    }

    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    const result = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(goals.createdAt);

    // Calculate actual progress for each goal
    const goalsWithProgress = await Promise.all(
      result.map(async (goal) => {
        const actualProgress = await calculateGoalProgress(goal.id, userId);
        return {
          ...goal,
          progressPercentage: actualProgress.toString(),
        };
      }),
    );

    return {
      success: true,
      data: goalsWithProgress,
    };
  } catch (error) {
    // Re-throw authentication errors to allow proper error handling
    if (error instanceof Error && error.name === 'AuthenticationError') {
      throw error;
    }
    console.error('Error fetching goals with progress:', error);
    return {
      success: false,
      error: 'Failed to fetch goals with progress',
    };
  }
}

export async function getGoal(
  goalId: string,
  userId: string,
): Promise<ActionResult<Goal>> {
  try {
    // Authentication check
    const user = await requireAuthentication();

    // Authorization check
    if (userId !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: Cannot access goal for different user',
      };
    }

    if (!goalId || !userId) {
      return {
        success: false,
        error: 'Goal ID and User ID are required',
      };
    }

    const result = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .limit(1);

    if (result.length === 0) {
      return {
        success: false,
        error: 'Goal not found',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    // Re-throw authentication errors to allow proper error handling
    if (error instanceof Error && error.name === 'AuthenticationError') {
      throw error;
    }
    console.error('Error fetching goal:', error);
    return {
      success: false,
      error: 'Failed to fetch goal',
    };
  }
}

export async function updateGoal(
  goalId: string,
  userId: string,
  updateData: Partial<NewGoal>,
): Promise<ActionResult<Goal>> {
  try {
    // Authentication check
    const user = await requireAuthentication();

    // Authorization check
    if (userId !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: Cannot update goal for different user',
      };
    }

    if (!goalId || !userId) {
      return {
        success: false,
        error: 'Goal ID and User ID are required',
      };
    }

    // Validate title if provided
    if (updateData.title !== undefined && updateData.title.trim() === '') {
      return {
        success: false,
        error: 'Title cannot be empty',
      };
    }

    // First check if goal exists and belongs to user
    const existingGoal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .limit(1);

    if (existingGoal.length === 0) {
      return {
        success: false,
        error: 'Goal not found',
      };
    }

    // Update goal
    const result = await db
      .update(goals)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to update goal',
      };
    }

    return {
      success: true,
      data: result[0],
    };
  } catch (error) {
    // Re-throw authentication errors to allow proper error handling
    if (error instanceof Error && error.name === 'AuthenticationError') {
      throw error;
    }
    console.error('Error updating goal:', error);
    return {
      success: false,
      error: 'Failed to update goal',
    };
  }
}

export async function deleteGoal(
  goalId: string,
  userId: string,
): Promise<ActionResult<undefined>> {
  try {
    // Authentication check
    const user = await requireAuthentication();

    // Authorization check
    if (userId !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: Cannot delete goal for different user',
      };
    }

    if (!goalId || !userId) {
      return {
        success: false,
        error: 'Goal ID and User ID are required',
      };
    }

    // First check if goal exists and belongs to user
    const existingGoal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
      .limit(1);

    if (existingGoal.length === 0) {
      return {
        success: false,
        error: 'Goal not found',
      };
    }

    // Delete goal (cascading deletes will handle related records)
    await db
      .delete(goals)
      .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    // Re-throw authentication errors to allow proper error handling
    if (error instanceof Error && error.name === 'AuthenticationError') {
      throw error;
    }
    console.error('Error deleting goal:', error);
    return {
      success: false,
      error: 'Failed to delete goal',
    };
  }
}
