import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAuthenticatedUser,
  requireAuthentication,
  AuthenticationError,
} from '@/lib/auth';
import type { Session } from 'next-auth';

// Mock the database connection to avoid Cloud SQL dependency in tests
vi.mock('@/lib/db', () => ({
  db: vi.fn(),
}));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

describe('Authentication Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuthenticatedUser', () => {
    it('should return user when session exists', async () => {
      const mockSession: Session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const { auth } = await import('@/auth');
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

      const user = await getAuthenticatedUser();

      expect(user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should return null when no session exists', async () => {
      const { auth } = await import('@/auth');
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const user = await getAuthenticatedUser();

      expect(user).toBeNull();
    });

    it('should return null when session has no user', async () => {
      const mockSession: Session = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as Session;

      const { auth } = await import('@/auth');
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

      const user = await getAuthenticatedUser();

      expect(user).toBeNull();
    });

    it('should return null when user has no id', async () => {
      const mockSession: Session = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as Session;

      const { auth } = await import('@/auth');
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

      const user = await getAuthenticatedUser();

      expect(user).toBeNull();
    });
  });

  describe('requireAuthentication', () => {
    it('should return user when authenticated', async () => {
      const mockSession: Session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const { auth } = await import('@/auth');
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

      const user = await requireAuthentication();

      expect(user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should throw AuthenticationError when no session exists', async () => {
      const { auth } = await import('@/auth');
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(requireAuthentication()).rejects.toThrow(
        AuthenticationError,
      );
      await expect(requireAuthentication()).rejects.toThrow(
        'Authentication required',
      );
    });

    it('should throw AuthenticationError when session has no user', async () => {
      const mockSession: Session = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as Session;

      const { auth } = await import('@/auth');
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

      await expect(requireAuthentication()).rejects.toThrow(
        AuthenticationError,
      );
      await expect(requireAuthentication()).rejects.toThrow(
        'Authentication required',
      );
    });

    it('should throw AuthenticationError when user has no id', async () => {
      const mockSession: Session = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as Session;

      const { auth } = await import('@/auth');
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

      await expect(requireAuthentication()).rejects.toThrow(
        AuthenticationError,
      );
      await expect(requireAuthentication()).rejects.toThrow(
        'Authentication required',
      );
    });

    it('should accept custom error message', async () => {
      const { auth } = await import('@/auth');
      (auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      await expect(requireAuthentication('Custom auth error')).rejects.toThrow(
        'Custom auth error',
      );
    });
  });

  describe('AuthenticationError', () => {
    it('should be an instance of Error', () => {
      const error = new AuthenticationError('Test error');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name', () => {
      const error = new AuthenticationError('Test error');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should have correct message', () => {
      const error = new AuthenticationError('Test error');
      expect(error.message).toBe('Test error');
    });
  });
});
