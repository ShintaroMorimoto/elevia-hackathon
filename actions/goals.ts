'use server';

import { db } from '@/lib/db';
import { goals } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { NewGoal, Goal } from '@/lib/db/schema';

export type ActionResult<T = any> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export async function createGoal(goalData: NewGoal): Promise<ActionResult<Goal>> {
  try {
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

    // Create goal
    const result = await db.insert(goals).values({
      ...goalData,
      status: goalData.status || 'active',
      progressPercentage: '0',
    }).returning();

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
    console.error('Error creating goal:', error);
    return {
      success: false,
      error: 'Failed to create goal',
    };
  }
}

export async function getGoals(userId: string): Promise<ActionResult<Goal[]>> {
  try {
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
    console.error('Error fetching goals:', error);
    return {
      success: false,
      error: 'Failed to fetch goals',
    };
  }
}

export async function getGoal(goalId: string, userId: string): Promise<ActionResult<Goal>> {
  try {
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
  updateData: Partial<NewGoal>
): Promise<ActionResult<Goal>> {
  try {
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
    console.error('Error updating goal:', error);
    return {
      success: false,
      error: 'Failed to update goal',
    };
  }
}

export async function deleteGoal(goalId: string, userId: string): Promise<ActionResult<void>> {
  try {
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
    };
  } catch (error) {
    console.error('Error deleting goal:', error);
    return {
      success: false,
      error: 'Failed to delete goal',
    };
  }
}