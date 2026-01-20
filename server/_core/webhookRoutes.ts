import express, { Router } from "express";
import { handleStripeWebhook } from "../stripeWebhook";

export function registerWebhookRoutes(app: express.Application) {
  // Stripe webhook MUST use raw body for signature verification
  // This route must be registered BEFORE express.json() middleware
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );
}
