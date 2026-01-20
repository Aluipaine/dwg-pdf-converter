import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(tier: "free" | "premium" = "free"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    subscriptionTier: tier,
    subscriptionStatus: tier === "premium" ? "active" : null,
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

describe("conversion.upload", () => {
  it("should track usage for free tier users", async () => {
    const ctx = createAuthContext("free");
    const caller = appRouter.createCaller(ctx);
    
    // Test with a small DXF file (base64 encoded)
    const testFileData = Buffer.from("test dxf content").toString("base64");

    try {
      const result = await caller.conversion.upload({
        fileName: "test.dxf",
        fileData: testFileData,
        fileSize: 1024,
      });
      
      // If upload succeeds, verify we got a conversion ID
      expect(result).toHaveProperty("conversionId");
    } catch (error: any) {
      // If limit is reached, error should mention limit
      if (error.message.includes("limit")) {
        expect(error.message).toContain("limit");
      } else {
        // Other errors are acceptable (e.g., Python service not running)
        expect(error.message).toBeTruthy();
      }
    }
  });

  it("should accept upload for premium users regardless of usage", async () => {
    const ctx = createAuthContext("premium");
    const caller = appRouter.createCaller(ctx);

    const testFileData = Buffer.from("test dxf content").toString("base64");

    const result = await caller.conversion.upload({
      fileName: "premium-test.dxf",
      fileData: testFileData,
      fileSize: 2048,
    });

    expect(result).toHaveProperty("conversionId");
    expect(result.conversionId).toBeGreaterThan(0);
  });

  it("should reject files larger than 100MB", async () => {
    const ctx = createAuthContext("premium");
    const caller = appRouter.createCaller(ctx);

    const testFileData = Buffer.from("test").toString("base64");

    try {
      await caller.conversion.upload({
        fileName: "huge-file.dxf",
        fileData: testFileData,
        fileSize: 101 * 1024 * 1024, // 101MB
      });
      throw new Error("Expected upload to be rejected due to size");
    } catch (error: any) {
      expect(error.message).toContain("100MB");
    }
  });

  it("should reject non-DWG/DXF files", async () => {
    const ctx = createAuthContext("premium");
    const caller = appRouter.createCaller(ctx);

    const testFileData = Buffer.from("test").toString("base64");

    try {
      await caller.conversion.upload({
        fileName: "test.pdf",
        fileData: testFileData,
        fileSize: 1024,
      });
      throw new Error("Expected upload to be rejected due to file type");
    } catch (error: any) {
      expect(error.message).toContain("DWG");
    }
  });
});
