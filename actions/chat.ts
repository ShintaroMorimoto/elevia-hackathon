'use server';

import { db } from '@/lib/db';
import { chatSessions, chatMessages } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import type {
  NewChatSession,
  ChatSession,
  NewChatMessage,
  ChatMessage,
} from '@/lib/db/schema';
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

export async function createChatSession(
  sessionData: NewChatSession,
): Promise<ActionResult<ChatSession>> {
  try {
    // Authentication check
    await requireAuthentication();

    // Validation
    if (!sessionData.goalId || sessionData.goalId.trim() === '') {
      return {
        success: false,
        error: 'Goal ID is required',
      };
    }

    // Create chat session
    const result = await db
      .insert(chatSessions)
      .values({
        ...sessionData,
        status: sessionData.status || 'active',
      })
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to create chat session',
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
    console.error('Error creating chat session:', error);
    return {
      success: false,
      error: 'Failed to create chat session',
    };
  }
}

export async function addChatMessage(
  messageData: NewChatMessage,
): Promise<ActionResult<ChatMessage>> {
  try {
    // Authentication check
    await requireAuthentication();

    // Validation
    if (!messageData.sessionId || messageData.sessionId.trim() === '') {
      return {
        success: false,
        error: 'Session ID is required',
      };
    }

    if (!messageData.content || messageData.content.trim() === '') {
      return {
        success: false,
        error: 'Message content is required',
      };
    }

    if (
      !messageData.senderType ||
      !['user', 'ai'].includes(messageData.senderType)
    ) {
      return {
        success: false,
        error: 'Sender type must be user or ai',
      };
    }

    if (
      typeof messageData.messageOrder !== 'number' ||
      messageData.messageOrder < 0
    ) {
      return {
        success: false,
        error: 'Message order must be a non-negative number',
      };
    }

    // Add chat message
    const result = await db
      .insert(chatMessages)
      .values(messageData)
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to add chat message',
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
    console.error('Error adding chat message:', error);
    return {
      success: false,
      error: 'Failed to add chat message',
    };
  }
}

export async function getChatMessages(
  sessionId: string,
): Promise<ActionResult<ChatMessage[]>> {
  try {
    // Authentication check
    await requireAuthentication();

    if (!sessionId || sessionId.trim() === '') {
      return {
        success: false,
        error: 'Session ID is required',
      };
    }

    const result = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.messageOrder));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // Re-throw authentication errors to allow proper error handling
    if (error instanceof Error && error.name === 'AuthenticationError') {
      throw error;
    }
    console.error('Error fetching chat messages:', error);
    return {
      success: false,
      error: 'Failed to fetch chat messages',
    };
  }
}

export async function updateChatSession(
  sessionId: string,
  updateData: Partial<NewChatSession>,
): Promise<ActionResult<ChatSession>> {
  try {
    // Authentication check
    await requireAuthentication();

    if (!sessionId || sessionId.trim() === '') {
      return {
        success: false,
        error: 'Session ID is required',
      };
    }

    // First check if session exists
    const existingSession = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (existingSession.length === 0) {
      return {
        success: false,
        error: 'Chat session not found',
      };
    }

    // Update session
    const result = await db
      .update(chatSessions)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId))
      .returning();

    if (result.length === 0) {
      return {
        success: false,
        error: 'Failed to update chat session',
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
    console.error('Error updating chat session:', error);
    return {
      success: false,
      error: 'Failed to update chat session',
    };
  }
}
