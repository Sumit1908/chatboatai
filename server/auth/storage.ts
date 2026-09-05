import { users, adminAuditLog, type User, type UpsertUser, type AdminAuditLogEntry } from "@shared/models/auth";
import { db } from "@db";
import { eq, desc } from "drizzle-orm";

// Interface for auth storage operations
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  updateUserSubscription(userId: string, updates: Partial<User>): Promise<User | undefined>;
  getUserStats(userId: string): Promise<{ contactsCount: number; messagesCount: number; notificationsCount: number }>;
  deleteUser(userId: string): Promise<boolean>;
  addAuditLogEntry(entry: {
    actorUserId: string;
    actorLabel: string;
    action: string;
    targetUserId?: string;
    targetLabel?: string;
    description: string;
  }): Promise<AdminAuditLogEntry>;
  getAuditLog(limit?: number): Promise<AdminAuditLogEntry[]>;
}

// Never let the password hash leave this module - every method below strips it
// before returning, since callers only ever need it for cache-fresh auth checks.
function hidePassword(user: User): User {
  return { ...user, passwordHash: null };
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ? hidePassword(user) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return hidePassword(user);
  }

  async getAllUsers(): Promise<User[]> {
    const all = await db.select().from(users).orderBy(desc(users.createdAt));
    return all.map(hidePassword);
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user ? hidePassword(user) : undefined;
  }

  async updateUserSubscription(userId: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user ? hidePassword(user) : undefined;
  }

  async getUserStats(userId: string): Promise<{ contactsCount: number; messagesCount: number; notificationsCount: number }> {
    // For now, return mock data - would need user-scoped tables for real implementation
    return { contactsCount: 0, messagesCount: 0, notificationsCount: 0 };
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, userId)).returning();
    return result.length > 0;
  }

  async addAuditLogEntry(entry: {
    actorUserId: string;
    actorLabel: string;
    action: string;
    targetUserId?: string;
    targetLabel?: string;
    description: string;
  }): Promise<AdminAuditLogEntry> {
    const [row] = await db.insert(adminAuditLog).values(entry).returning();
    return row;
  }

  async getAuditLog(limit = 100): Promise<AdminAuditLogEntry[]> {
    return db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.timestamp)).limit(limit);
  }
}

export const authStorage = new AuthStorage();
