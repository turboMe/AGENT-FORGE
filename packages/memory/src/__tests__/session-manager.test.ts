import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionManager } from '../session.js';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager({ ttlMs: 60_000, maxSessionsPerUser: 3 });
  });

  describe('createSession', () => {
    it('should create a session with a unique ID', () => {
      const session = manager.createSession('user-1');

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-1');
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.lastActiveAt).toBeInstanceOf(Date);
      expect(session.endedAt).toBeUndefined();
    });

    it('should create distinct session IDs', () => {
      const s1 = manager.createSession('user-1');
      const s2 = manager.createSession('user-1');

      expect(s1.id).not.toBe(s2.id);
    });

    it('should evict oldest session when exceeding max limit', () => {
      vi.useFakeTimers();

      const s1 = manager.createSession('user-1');
      vi.advanceTimersByTime(100);
      manager.createSession('user-1');
      vi.advanceTimersByTime(100);
      manager.createSession('user-1');
      vi.advanceTimersByTime(100);

      // At limit (3). Creating 4th should evict oldest (s1).
      manager.createSession('user-1');

      // s1 should be evicted
      expect(manager.getSession(s1.id)).toBeNull();

      // Should still have 3 active sessions
      expect(manager.getUserSessions('user-1')).toHaveLength(3);

      vi.useRealTimers();
    });
  });

  describe('getSession', () => {
    it('should retrieve an active session', () => {
      const created = manager.createSession('user-1');
      const retrieved = manager.getSession(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should return null for unknown session ID', () => {
      expect(manager.getSession('nonexistent')).toBeNull();
    });

    it('should return null for ended session', () => {
      const session = manager.createSession('user-1');
      manager.endSession(session.id);

      expect(manager.getSession(session.id)).toBeNull();
    });

    it('should update lastActiveAt on access', () => {
      const session = manager.createSession('user-1');
      const originalLastActive = session.lastActiveAt.getTime();

      // Small delay to ensure time difference
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      const retrieved = manager.getSession(session.id);
      expect(retrieved!.lastActiveAt.getTime()).toBeGreaterThanOrEqual(originalLastActive);

      vi.useRealTimers();
    });

    it('should return null for expired session', () => {
      vi.useFakeTimers();

      const session = manager.createSession('user-1');

      // Advance time past TTL
      vi.advanceTimersByTime(61_000);

      expect(manager.getSession(session.id)).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('endSession', () => {
    it('should mark session as ended', () => {
      const session = manager.createSession('user-1');
      const ended = manager.endSession(session.id);

      expect(ended).not.toBeNull();
      expect(ended!.endedAt).toBeInstanceOf(Date);
    });

    it('should return null for unknown session', () => {
      expect(manager.endSession('nonexistent')).toBeNull();
    });
  });

  describe('getUserSessions', () => {
    it('should return all active sessions for a user', () => {
      manager.createSession('user-1');
      manager.createSession('user-1');
      manager.createSession('user-2');

      expect(manager.getUserSessions('user-1')).toHaveLength(2);
      expect(manager.getUserSessions('user-2')).toHaveLength(1);
      expect(manager.getUserSessions('user-3')).toHaveLength(0);
    });

    it('should not include ended sessions', () => {
      const s1 = manager.createSession('user-1');
      manager.createSession('user-1');
      manager.endSession(s1.id);

      expect(manager.getUserSessions('user-1')).toHaveLength(1);
    });

    it('should return sessions sorted by most recent first', () => {
      vi.useFakeTimers();

      const s1 = manager.createSession('user-1');
      vi.advanceTimersByTime(1000);
      const s2 = manager.createSession('user-1');

      const sessions = manager.getUserSessions('user-1');
      expect(sessions[0]!.id).toBe(s2.id);
      expect(sessions[1]!.id).toBe(s1.id);

      vi.useRealTimers();
    });
  });

  describe('getActiveCount', () => {
    it('should return the number of active sessions', () => {
      expect(manager.getActiveCount()).toBe(0);

      manager.createSession('user-1');
      manager.createSession('user-2');

      expect(manager.getActiveCount()).toBe(2);
    });

    it('should not count expired sessions', () => {
      vi.useFakeTimers();

      manager.createSession('user-1');
      vi.advanceTimersByTime(61_000);

      expect(manager.getActiveCount()).toBe(0);

      vi.useRealTimers();
    });
  });
});
