import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NewYearlyOkr, YearlyOkr, NewQuarterlyOkr, QuarterlyOkr, NewKeyResult, KeyResult } from '../../lib/db/schema';

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
const { 
  createYearlyOkr, 
  createQuarterlyOkr, 
  createKeyResult, 
  updateYearlyOkr, 
  updateQuarterlyOkr, 
  updateKeyResult,
  getOkrsByGoal,
  deleteYearlyOkr,
  deleteQuarterlyOkr,
  deleteKeyResult
} = await import('../../actions/okr');

describe('OKR Server Actions', () => {
  const mockGoalId = 'goal-123';
  const mockYearlyOkrId = 'yearly-okr-123';
  const mockQuarterlyOkrId = 'quarterly-okr-123';
  const mockKeyResultId = 'key-result-123';

  const mockNewYearlyOkr: NewYearlyOkr = {
    goalId: mockGoalId,
    objective: 'Test Yearly Objective',
    targetYear: 2025,
    sortOrder: 1,
  };

  const mockYearlyOkr: YearlyOkr = {
    id: mockYearlyOkrId,
    goalId: mockGoalId,
    objective: 'Test Yearly Objective',
    targetYear: 2025,
    sortOrder: 1,
    progressPercentage: '0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNewQuarterlyOkr: NewQuarterlyOkr = {
    yearlyOkrId: mockYearlyOkrId,
    objective: 'Test Quarterly Objective',
    targetYear: 2025,
    targetQuarter: 1,
    sortOrder: 1,
  };

  const mockQuarterlyOkr: QuarterlyOkr = {
    id: mockQuarterlyOkrId,
    yearlyOkrId: mockYearlyOkrId,
    objective: 'Test Quarterly Objective',
    targetYear: 2025,
    targetQuarter: 1,
    sortOrder: 1,
    progressPercentage: '0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNewKeyResult: NewKeyResult = {
    yearlyOkrId: mockYearlyOkrId,
    quarterlyOkrId: null,
    description: 'Test Key Result',
    targetValue: '100',
    currentValue: '0',
    unit: '%',
    sortOrder: 1,
  };

  const mockKeyResult: KeyResult = {
    id: mockKeyResultId,
    yearlyOkrId: mockYearlyOkrId,
    quarterlyOkrId: null,
    description: 'Test Key Result',
    targetValue: '100',
    currentValue: '0',
    unit: '%',
    achievementRate: '0',
    sortOrder: 1,
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

  describe('createYearlyOkr', () => {
    it('should create a new yearly OKR successfully', async () => {
      // Mock successful yearly OKR creation
      mockReturning.mockResolvedValueOnce([mockYearlyOkr]);
      
      const result = await createYearlyOkr(mockNewYearlyOkr);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          goalId: mockGoalId,
          objective: 'Test Yearly Objective',
          targetYear: 2025,
        }),
      });
    });

    it('should validate required fields', async () => {
      const invalidOkr = { ...mockNewYearlyOkr, objective: '' };
      const result = await createYearlyOkr(invalidOkr);
      
      expect(result).toEqual({
        success: false,
        error: 'Objective is required',
      });
    });

    it('should validate target year', async () => {
      const invalidOkr = { ...mockNewYearlyOkr, targetYear: 1900 };
      const result = await createYearlyOkr(invalidOkr);
      
      expect(result).toEqual({
        success: false,
        error: 'Target year must be a valid year (2000-2100)',
      });
    });
  });

  describe('createQuarterlyOkr', () => {
    it('should create a new quarterly OKR successfully', async () => {
      // Mock successful quarterly OKR creation
      mockReturning.mockResolvedValueOnce([mockQuarterlyOkr]);
      
      const result = await createQuarterlyOkr(mockNewQuarterlyOkr);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          yearlyOkrId: mockYearlyOkrId,
          objective: 'Test Quarterly Objective',
          targetQuarter: 1,
        }),
      });
    });

    it('should validate target quarter', async () => {
      const invalidOkr = { ...mockNewQuarterlyOkr, targetQuarter: 5 };
      const result = await createQuarterlyOkr(invalidOkr);
      
      expect(result).toEqual({
        success: false,
        error: 'Target quarter must be between 1 and 4',
      });
    });
  });

  describe('createKeyResult', () => {
    it('should create a new key result successfully', async () => {
      // Mock successful key result creation
      mockReturning.mockResolvedValueOnce([mockKeyResult]);
      
      const result = await createKeyResult(mockNewKeyResult);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          description: 'Test Key Result',
          targetValue: '100',
          unit: '%',
        }),
      });
    });

    it('should validate required fields', async () => {
      const invalidKr = { ...mockNewKeyResult, description: '' };
      const result = await createKeyResult(invalidKr);
      
      expect(result).toEqual({
        success: false,
        error: 'Description is required',
      });
    });

    it('should validate target value', async () => {
      const invalidKr = { ...mockNewKeyResult, targetValue: '' };
      const result = await createKeyResult(invalidKr);
      
      expect(result).toEqual({
        success: false,
        error: 'Target value is required',
      });
    });

    it('should require either yearly or quarterly OKR association', async () => {
      const invalidKr = { ...mockNewKeyResult, yearlyOkrId: null, quarterlyOkrId: null };
      const result = await createKeyResult(invalidKr);
      
      expect(result).toEqual({
        success: false,
        error: 'Key result must be associated with either yearly or quarterly OKR',
      });
    });
  });

  describe('getOkrsByGoal', () => {
    it('should return OKRs for a specific goal', async () => {
      // Mock successful OKR retrieval
      mockOrderBy.mockResolvedValueOnce([mockYearlyOkr]);
      
      const result = await getOkrsByGoal(mockGoalId);
      
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            goalId: mockGoalId,
          }),
        ]),
      });
    });

    it('should validate goal ID', async () => {
      const result = await getOkrsByGoal('');
      
      expect(result).toEqual({
        success: false,
        error: 'Goal ID is required',
      });
    });
  });

  describe('updateYearlyOkr', () => {
    it('should update a yearly OKR successfully', async () => {
      // Mock existing OKR check
      mockLimit.mockResolvedValueOnce([mockYearlyOkr]);
      // Mock successful update
      const updatedOkr = { ...mockYearlyOkr, objective: 'Updated Objective' };
      mockReturning.mockResolvedValueOnce([updatedOkr]);
      
      const updateData = { objective: 'Updated Objective' };
      const result = await updateYearlyOkr(mockYearlyOkrId, updateData);
      
      expect(result).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockYearlyOkrId,
          objective: 'Updated Objective',
        }),
      });
    });

    it('should return not found for non-existent OKR', async () => {
      // Mock empty OKR check
      mockLimit.mockResolvedValueOnce([]);
      
      const result = await updateYearlyOkr('non-existent', { objective: 'Updated' });
      
      expect(result).toEqual({
        success: false,
        error: 'Yearly OKR not found',
      });
    });
  });

  describe('deleteYearlyOkr', () => {
    it('should delete a yearly OKR successfully', async () => {
      // Mock existing OKR check
      mockLimit.mockResolvedValueOnce([mockYearlyOkr]);
      
      const result = await deleteYearlyOkr(mockYearlyOkrId);
      
      expect(result).toEqual({
        success: true,
      });
    });

    it('should return not found for non-existent OKR', async () => {
      // Mock empty OKR check
      mockLimit.mockResolvedValueOnce([]);
      
      const result = await deleteYearlyOkr('non-existent');
      
      expect(result).toEqual({
        success: false,
        error: 'Yearly OKR not found',
      });
    });
  });
});