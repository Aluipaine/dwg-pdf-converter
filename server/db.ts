import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversions, usageTracking, analyticsEvents, emailQueue, Conversion, InsertConversion, UsageTracking, InsertUsageTracking, InsertAnalyticsEvent, InsertEmailQueue } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER MANAGEMENT =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserSubscription(userId: number, data: {
  subscriptionTier?: "free" | "premium";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing";
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getAllUsers(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt));
}

// ============= CONVERSION MANAGEMENT =============

export async function createConversion(data: InsertConversion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(conversions).values(data);
  return result[0].insertId;
}

export async function getConversionById(conversionId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(conversions).where(eq(conversions.id, conversionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserConversions(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(conversions)
    .where(eq(conversions.userId, userId))
    .orderBy(desc(conversions.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function updateConversionStatus(
  conversionId: number,
  status: "pending" | "processing" | "completed" | "failed",
  data?: {
    pdfFileKey?: string;
    pdfFileUrl?: string;
    errorMessage?: string;
    processingStartedAt?: Date;
    processingCompletedAt?: Date;
    processingTimeMs?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(conversions).set({ status, ...data }).where(eq(conversions.id, conversionId));
}

export async function getAllConversions(limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(conversions).orderBy(desc(conversions.createdAt)).limit(limit).offset(offset);
}

export async function getConversionStats() {
  const db = await getDb();
  if (!db) return { total: 0, completed: 0, failed: 0, pending: 0, processing: 0 };

  const stats = await db
    .select({
      status: conversions.status,
      count: count(),
    })
    .from(conversions)
    .groupBy(conversions.status);

  const result = {
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    processing: 0,
  };

  stats.forEach((stat) => {
    result.total += stat.count;
    if (stat.status === "completed") result.completed = stat.count;
    if (stat.status === "failed") result.failed = stat.count;
    if (stat.status === "pending") result.pending = stat.count;
    if (stat.status === "processing") result.processing = stat.count;
  });

  return result;
}

// ============= USAGE TRACKING =============

export async function getOrCreateUsageTracking(userId: number, month: string): Promise<UsageTracking> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db.insert(usageTracking).values({
    userId,
    month,
    conversionsCount: 0,
  });

  return {
    id: result[0].insertId,
    userId,
    month,
    conversionsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function incrementUsageCount(userId: number, month: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(usageTracking)
    .set({
      conversionsCount: sql`${usageTracking.conversionsCount} + 1`,
    })
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)));
}

export async function getUserUsage(userId: number, month: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(usageTracking)
    .where(and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============= ANALYTICS =============

export async function trackAnalyticsEvent(data: InsertAnalyticsEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(analyticsEvents).values(data);
}

export async function getAnalyticsEvents(
  eventType?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 1000
) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(analyticsEvents);

  const conditions = [];
  if (eventType) conditions.push(eq(analyticsEvents.eventType, eventType as any));
  if (startDate) conditions.push(gte(analyticsEvents.createdAt, startDate));
  if (endDate) conditions.push(lte(analyticsEvents.createdAt, endDate));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query.orderBy(desc(analyticsEvents.createdAt)).limit(limit);
}

export async function getConversionAnalytics(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return { totalConversions: 0, avgProcessingTimeMs: 0, totalFileSize: 0 };

  const conditions = [];
  if (startDate) conditions.push(gte(conversions.createdAt, startDate));
  if (endDate) conditions.push(lte(conversions.createdAt, endDate));

  let query = db
    .select({
      totalConversions: count(),
      avgProcessingTimeMs: sql<number>`AVG(${conversions.processingTimeMs})`,
      totalFileSize: sql<number>`SUM(${conversions.fileSize})`,
    })
    .from(conversions);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query;
  return result[0] || { totalConversions: 0, avgProcessingTimeMs: 0, totalFileSize: 0 };
}

// ============= EMAIL QUEUE =============

export async function queueEmail(data: InsertEmailQueue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(emailQueue).values(data);
  return result[0].insertId;
}

export async function getPendingEmails(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(emailQueue)
    .where(eq(emailQueue.status, "pending"))
    .orderBy(emailQueue.createdAt)
    .limit(limit);
}

export async function updateEmailStatus(
  emailId: number,
  status: "pending" | "sent" | "failed",
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(emailQueue)
    .set({
      status,
      errorMessage,
      sentAt: status === "sent" ? new Date() : undefined,
    })
    .where(eq(emailQueue.id, emailId));
}
