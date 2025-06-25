import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NewGoal, Goal } from '../../lib/db/schema';

// Mock the database with proper chain methods
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockReturning = vi.fn();
const mockValues = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockSet = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock('../../lib/db', () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

// Chain mocks - setup default returns
mockInsert.mockReturnValue({ values: mockValues });
mockValues.mockReturnValue({ returning: mockReturning });
mockSelect.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
mockOrderBy.mockReturnValue(Promise.resolve([]));
mockLimit.mockReturnValue(Promise.resolve([]));
mockUpdate.mockReturnValue({ set: mockSet });
mockSet.mockReturnValue({ where: mockWhere });
mockDelete.mockReturnValue({ where: mockWhere });
mockReturning.mockReturnValue(Promise.resolve([]));

// Dynamic import to ensure mock is loaded
const { createGoal, getGoals, getGoal, updateGoal, deleteGoal } = await import('../../actions/goals');

describe('Goal Server Actions', () => {
  const mockUserId = 'user-123';
  const mockGoalId = 'goal-123';
  
  const mockNewGoal: NewGoal = {
    userId: mockUserId,
    title: 'Test Goal',
    description: 'Test Description',
    dueDate: '2025-12-31',
    status: 'active',
  };

  const mockGoal: Goal = {
    id: mockGoalId,
    userId: mockUserId,
    title: 'Test Goal',
    description: 'Test Description',
    dueDate: '2025-12-31',
    status: 'active',
    progressPercentage: '0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain mocks
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
    mockOrderBy.mockReturnValue(Promise.resolve([]));
    mockLimit.mockReturnValue(Promise.resolve([]));
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockDelete.mockReturnValue({ where: mockWhere });
    mockReturning.mockReturnValue(Promise.resolve([]));
  });

  describe('createGoal', () => {
    it('should create a new goal successfully', async () => {
      // Mock successful goal creation
      mockReturning.mockResolvedValueOnce([mockGoal]);
      
      const result = await createGoal(mockNewGoal);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          userId: mockUserId,
          title: 'Test Goal',
          description: 'Test Description',
          dueDate: '2025-12-31',
          status: 'active',
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      const result = await createGoal(mockNewGoal);
      
      expect(result).toEqual({
        success: false,
        error: expect.any(String),
      });
    });

    it('should validate required fields', async () => {
      const invalidGoal = { ...mockNewGoal, title: '' };
      const result = await createGoal(invalidGoal);
      
      expect(result).toEqual({
        success: false,
        error: 'Title is required',
      });
    });
  });

  describe('getGoals', () => {
    it('should return goals for a specific user', async () => {
      // Mock successful goal retrieval
      mockOrderBy.mockResolvedValueOnce([mockGoal]);
      
      const result = await getGoals(mockUserId);
      
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: mockUserId,
          }),
        ]),
      });
    });

    it('should return empty array when user has no goals', async () => {
      // Mock empty goal retrieval
      mockOrderBy.mockResolvedValueOnce([]);
      
      const result = await getGoals('user-with-no-goals');
      
      expect(result).toEqual({
        success: true,
        data: [],
      });
    });

    it('should handle database errors', async () => {
      // Mock database error
      mockOrderBy.mockRejectedValueOnce(new Error('Database error'));
      
      const result = await getGoals('invalid-user');
      
      expect(result).toEqual({
        success: false,
        error: expect.any(String),
      });
    });
  });

  describe('getGoal', () => {
    it('should return a specific goal', async () => {
      // Mock successful goal retrieval
      mockLimit.mockResolvedValueOnce([mockGoal]);
      
      const result = await getGoal(mockGoalId, mockUserId);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockGoalId,
          userId: mockUserId,
        }),
      });
    });

    it('should return not found for non-existent goal', async () => {
      const result = await getGoal('non-existent-goal', mockUserId);
      
      expect(result).toEqual({
        success: false,
        error: 'Goal not found',
      });
    });

    it('should prevent access to other users goals', async () => {
      const result = await getGoal(mockGoalId, 'other-user');
      
      expect(result).toEqual({
        success: false,
        error: 'Goal not found',
      });
    });
  });

  describe('updateGoal', () => {
    it('should update a goal successfully', async () => {
      // Mock existing goal check
      mockLimit.mockResolvedValueOnce([mockGoal]);
      // Mock successful update
      const updatedGoal = { ...mockGoal, title: 'Updated Goal' };
      mockReturning.mockResolvedValueOnce([updatedGoal]);
      
      const updateData = { title: 'Updated Goal' };
      const result = await updateGoal(mockGoalId, mockUserId, updateData);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockGoalId,
          title: 'Updated Goal',
        }),
      });
    });

    it('should return not found for non-existent goal', async () => {
      const result = await updateGoal('non-existent-goal', mockUserId, { title: 'Updated' });
      
      expect(result).toEqual({
        success: false,
        error: 'Goal not found',
      });
    });

    it('should prevent updating other users goals', async () => {
      const result = await updateGoal(mockGoalId, 'other-user', { title: 'Updated' });
      
      expect(result).toEqual({
        success: false,
        error: 'Goal not found',
      });
    });
  });

  describe('deleteGoal', () => {
    it('should delete a goal successfully', async () => {
      // Mock existing goal check
      mockLimit.mockResolvedValueOnce([mockGoal]);
      
      const result = await deleteGoal(mockGoalId, mockUserId);
      
      expect(result).toEqual({
        success: true,
      });
    });

    it('should return not found for non-existent goal', async () => {
      const result = await deleteGoal('non-existent-goal', mockUserId);
      
      expect(result).toEqual({
        success: false,
        error: 'Goal not found',
      });
    });

    it('should prevent deleting other users goals', async () => {
      const result = await deleteGoal(mockGoalId, 'other-user');
      
      expect(result).toEqual({
        success: false,
        error: 'Goal not found',
      });
    });
  });
});