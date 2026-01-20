import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { pythonClient } from "./pythonClient";
import { storagePut, storageGet } from "./storage";
import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Helper to get current month string
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Helper to check if user has reached conversion limit
async function checkConversionLimit(userId: number, subscriptionTier: string): Promise<boolean> {
  if (subscriptionTier === "premium") {
    return true; // Unlimited for premium
  }

  const currentMonth = getCurrentMonth();
  const usage = await db.getUserUsage(userId, currentMonth);

  const FREE_TIER_LIMIT = 5;
  return !usage || usage.conversionsCount < FREE_TIER_LIMIT;
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  conversion: router({
    // Upload file and start conversion
    upload: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileData: z.string(), // base64 encoded file
          fileSize: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user;

        // Check conversion limit
        const canConvert = await checkConversionLimit(user.id, user.subscriptionTier);
        if (!canConvert) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Monthly conversion limit reached. Please upgrade to Premium for unlimited conversions.",
          });
        }

        // Validate file extension
        const ext = path.extname(input.fileName).toLowerCase();
        if (![".dwg", ".dxf"].includes(ext)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only DWG and DXF files are supported",
          });
        }

        // Validate file size (100MB max)
        if (input.fileSize > 100 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File size exceeds 100MB limit",
          });
        }

        try {
          // Decode base64 file data
          const fileBuffer = Buffer.from(input.fileData, "base64");

          // Generate unique file keys
          const fileId = nanoid();
          const dwgFileKey = `conversions/${user.id}/${fileId}/${input.fileName}`;
          const pdfFileName = input.fileName.replace(/\.(dwg|dxf)$/i, ".pdf");
          const pdfFileKey = `conversions/${user.id}/${fileId}/${pdfFileName}`;

          // Upload DWG/DXF to S3
          const { url: dwgFileUrl } = await storagePut(dwgFileKey, fileBuffer, "application/octet-stream");

          // Save file temporarily for Python service
          const tempDir = "/tmp/dwg-conversions";
          await fs.mkdir(tempDir, { recursive: true });
          const tempInputPath = path.join(tempDir, `${fileId}_input${ext}`);
          const tempOutputPath = path.join(tempDir, `${fileId}_output.pdf`);
          await fs.writeFile(tempInputPath, fileBuffer);

          // Create conversion record
          const priority = user.subscriptionTier === "premium" ? 10 : 0;
          const conversionId = await db.createConversion({
            userId: user.id,
            originalFileName: input.fileName,
            fileSize: input.fileSize,
            dwgFileKey,
            dwgFileUrl,
            status: "pending",
            priority,
          });

          // Submit to Python conversion service
          const conversionResponse = await pythonClient.submitConversion({
            input_path: tempInputPath,
            output_path: tempOutputPath,
            priority,
          });

          if (!conversionResponse.success || !conversionResponse.task_id) {
            await db.updateConversionStatus(conversionId, "failed", {
              errorMessage: conversionResponse.error || "Failed to submit conversion job",
            });
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to start conversion",
            });
          }

          // Update conversion with task ID
          await db.updateConversionStatus(conversionId, "processing", {
            processingStartedAt: new Date(),
          });

          // Track analytics event
          await db.trackAnalyticsEvent({
            userId: user.id,
            eventType: "conversion_started",
            metadata: JSON.stringify({ conversionId, fileName: input.fileName }),
          });

          // Increment usage count
          const currentMonth = getCurrentMonth();
          await db.getOrCreateUsageTracking(user.id, currentMonth);
          await db.incrementUsageCount(user.id, currentMonth);

          // Start background task to poll conversion status
          pollConversionStatus(conversionId, conversionResponse.task_id, tempOutputPath, pdfFileKey);

          return {
            success: true,
            conversionId,
            taskId: conversionResponse.task_id,
            message: "Conversion started successfully",
          };
        } catch (error: any) {
          console.error("[Conversion] Upload failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to process file upload",
          });
        }
      }),

    // Get conversion status
    getStatus: protectedProcedure
      .input(z.object({ conversionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conversion = await db.getConversionById(input.conversionId);

        if (!conversion) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Conversion not found" });
        }

        if (conversion.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        return conversion;
      }),

    // Get user's conversion history
    getHistory: protectedProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const conversions = await db.getUserConversions(ctx.user.id, input.limit, input.offset);
        return conversions;
      }),

    // Get user's current usage
    getUsage: protectedProcedure.query(async ({ ctx }) => {
      const currentMonth = getCurrentMonth();
      const usage = await db.getUserUsage(ctx.user.id, currentMonth);
      const limit = ctx.user.subscriptionTier === "premium" ? -1 : 5; // -1 means unlimited

      return {
        used: usage?.conversionsCount || 0,
        limit,
        tier: ctx.user.subscriptionTier,
        month: currentMonth,
      };
    }),
  }),

  subscription: router({
    // Get current subscription info
    getCurrent: protectedProcedure.query(async ({ ctx }) => {
      return {
        tier: ctx.user.subscriptionTier,
        status: ctx.user.subscriptionStatus,
        startDate: ctx.user.subscriptionStartDate,
        endDate: ctx.user.subscriptionEndDate,
      };
    }),

    // Create Stripe checkout session for Premium upgrade
    createCheckout: protectedProcedure.mutation(async ({ ctx }) => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2025-12-15.clover",
      });

      const origin = ctx.req.headers.origin || "http://localhost:3000";

      try {
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            customer_email: ctx.user.email || "",
            customer_name: ctx.user.name || "",
          },
          line_items: [
            {
              price: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_premium_monthly",
              quantity: 1,
            },
          ],
          success_url: `${origin}/dashboard?upgrade=success`,
          cancel_url: `${origin}/dashboard?upgrade=canceled`,
          allow_promotion_codes: true,
        });

        return {
          checkoutUrl: session.url,
        };
      } catch (error: any) {
        console.error("[Stripe] Failed to create checkout session:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create checkout session",
        });
      }
    }),
  }),

  admin: router({
    // Get all users
    getUsers: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return await db.getAllUsers(input.limit, input.offset);
      }),

    // Get all conversions
    getConversions: adminProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        return await db.getAllConversions(input.limit, input.offset);
      }),

    // Get conversion statistics
    getStats: adminProcedure.query(async () => {
      const conversionStats = await db.getConversionStats();
      const queueStats = await pythonClient.getQueueStats();

      return {
        conversions: conversionStats,
        queue: queueStats || { active: 0, scheduled: 0, reserved: 0, total_pending: 0 },
      };
    }),

    // Get analytics data
    getAnalytics: adminProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        const analytics = await db.getConversionAnalytics(input.startDate, input.endDate);
        return analytics;
      }),

    // Update user role
    updateUserRole: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(["user", "admin"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateUserSubscription(input.userId, { role: input.role } as any);
        return { success: true };
      }),
  }),
});

// Background polling function for conversion status
async function pollConversionStatus(
  conversionId: number,
  taskId: string,
  tempOutputPath: string,
  pdfFileKey: string
) {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  let attempts = 0;

  const poll = async () => {
    attempts++;

    try {
      const status = await pythonClient.getTaskStatus(taskId);

      if (!status) {
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
          return;
        }
        await db.updateConversionStatus(conversionId, "failed", {
          errorMessage: "Failed to get task status",
          processingCompletedAt: new Date(),
        });
        return;
      }

      if (status.state === "SUCCESS" && status.result?.success) {
        // Upload PDF to S3
        const pdfBuffer = await fs.readFile(tempOutputPath);
        const { url: pdfFileUrl } = await storagePut(pdfFileKey, pdfBuffer, "application/pdf");

        // Update conversion record
        await db.updateConversionStatus(conversionId, "completed", {
          pdfFileKey,
          pdfFileUrl,
          processingCompletedAt: new Date(),
          processingTimeMs: status.result.processing_time_ms,
        });

        // Track analytics
        const conversion = await db.getConversionById(conversionId);
        if (conversion) {
          await db.trackAnalyticsEvent({
            userId: conversion.userId,
            eventType: "conversion_completed",
            metadata: JSON.stringify({ conversionId, processingTimeMs: status.result.processing_time_ms }),
          });

          // Queue email notification
          const user = await db.getUserById(conversion.userId);
          if (user?.email) {
            await db.queueEmail({
              userId: conversion.userId,
              recipientEmail: user.email,
              subject: "Your DWG conversion is ready!",
              body: `Your file "${conversion.originalFileName}" has been successfully converted to PDF. Download it from your dashboard.`,
              conversionId,
            });
          }
        }

        // Cleanup temp files
        await fs.unlink(tempOutputPath).catch(() => {});
        await fs.unlink(tempOutputPath.replace("_output.pdf", `_input${path.extname(conversion?.originalFileName || "")}`)).catch(() => {});
      } else if (status.state === "FAILURE") {
        await db.updateConversionStatus(conversionId, "failed", {
          errorMessage: status.result?.error || status.error || "Conversion failed",
          processingCompletedAt: new Date(),
        });

        // Track analytics
        await db.trackAnalyticsEvent({
          userId: (await db.getConversionById(conversionId))?.userId || 0,
          eventType: "conversion_failed",
          metadata: JSON.stringify({ conversionId, error: status.result?.error }),
        });
      } else if (attempts < maxAttempts) {
        // Still processing, poll again
        setTimeout(poll, 5000);
      } else {
        // Timeout
        await db.updateConversionStatus(conversionId, "failed", {
          errorMessage: "Conversion timeout",
          processingCompletedAt: new Date(),
        });
      }
    } catch (error) {
      console.error("[Polling] Error:", error);
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000);
      }
    }
  };

  // Start polling after 2 seconds
  setTimeout(poll, 2000);
}

export type AppRouter = typeof appRouter;
