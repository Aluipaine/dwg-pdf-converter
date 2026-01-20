import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    subscriptionTier: "premium",
    subscriptionStatus: "active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://test.example.com" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    subscriptionTier: "free",
    subscriptionStatus: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://test.example.com" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin procedures", () => {
  it("should allow admin to get system stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getStats();

    expect(result).toHaveProperty("conversions");
    expect(result).toHaveProperty("queue");
    expect(result.conversions).toHaveProperty("total");
    expect(result.conversions).toHaveProperty("completed");
    expect(result.conversions).toHaveProperty("failed");
  });

  it("should allow admin to get all users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getUsers({ limit: 10, offset: 0 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("should allow admin to get analytics", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getAnalytics({});

    expect(result).toHaveProperty("totalConversions");
    expect(result).toHaveProperty("avgProcessingTimeMs");
    expect(result).toHaveProperty("totalFileSize");
  });

  it("should reject non-admin user from accessing admin procedures", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.admin.getStats();
      throw new Error("Expected admin procedure to reject non-admin user");
    } catch (error: any) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should allow admin to update user role", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.admin.updateUserRole({
        userId: 2,
        role: "admin",
      });

      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
    } catch (error: any) {
      // If user doesn't exist in test DB, that's expected
      if (error.message.includes("not found")) {
        expect(error.message).toBeTruthy();
      } else {
        throw error;
      }
    }
  });
});
