import { randomUUID } from 'node:crypto';
import type { ISessionManager, Session, SessionConfig } from './types.js';

// ── Defaults ────────────────────────────────────────

const DEFAULT_TTL_MS = 3_600_000; // 1 hour
const DEFAULT_MAX_SESSIONS = 5;

// ── Session Manager ─────────────────────────────────

/**
 * Manages session lifecycle with in-memory storage.
 * Sessions auto-expire after the configured TTL.
 */
export class SessionManager implements ISessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly ttlMs: number;
  private readonly maxSessionsPerUser: number;

  constructor(config: SessionConfig = {}) {
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;
    this.maxSessionsPerUser = config.maxSessionsPerUser ?? DEFAULT_MAX_SESSIONS;
  }

  /**
   * Create a new session for the given user.
   * Evicts oldest session if the user exceeds the max limit.
   */
  createSession(userId: string): Session {
    this.purgeExpired();

    // Check user session limit — evict oldest if necessary
    const userSessions = this.getUserSessions(userId);
    if (userSessions.length >= this.maxSessionsPerUser) {
      const oldest = userSessions[userSessions.length - 1]!;
      this.sessions.delete(oldest.id);
    }

    const session: Session = {
      id: randomUUID(),
      userId,
      startedAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Retrieve an active session by ID.
   * Returns null if the session doesn't exist or has expired.
   */
  getSession(sessionId: string): Session | null {
    this.purgeExpired();

    const session = this.sessions.get(sessionId);
    if (!session || session.endedAt) return null;

    // Check TTL
    if (this.isExpired(session)) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Touch — update lastActiveAt
    session.lastActiveAt = new Date();
    return session;
  }

  /**
   * End a session explicitly.
   */
  endSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endedAt = new Date();
    return session;
  }

  /**
   * Get all active sessions for a user (sorted by most recent first).
   */
  getUserSessions(userId: string): Session[] {
    this.purgeExpired();

    return [...this.sessions.values()]
      .filter((s) => s.userId === userId && !s.endedAt && !this.isExpired(s))
      .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
  }

  // ── Internal ──────────────────────────────────────────

  private isExpired(session: Session): boolean {
    return Date.now() - session.lastActiveAt.getTime() > this.ttlMs;
  }

  private purgeExpired(): void {
    for (const [id, session] of this.sessions) {
      if (this.isExpired(session) || session.endedAt) {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Get total active session count (for monitoring).
   */
  getActiveCount(): number {
    this.purgeExpired();
    return this.sessions.size;
  }
}
