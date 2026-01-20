import { Request, Response } from "express";
import Stripe from "stripe";
import * as db from "./db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Stripe Webhook] Missing signature");
    return res.status(400).send("Missing signature");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Stripe] Checkout completed:", session.id);

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[Stripe] No user_id in checkout session metadata");
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  // Update user with Stripe customer ID
  await db.updateUserSubscription(parseInt(userId), {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
  });

  // Track analytics event
  await db.trackAnalyticsEvent({
    userId: parseInt(userId),
    eventType: "subscription_upgraded",
    metadata: JSON.stringify({
      customerId,
      subscriptionId,
      sessionId: session.id,
    }),
  });

  console.log(`[Stripe] User ${userId} upgraded to premium`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log("[Stripe] Subscription updated:", subscription.id);

  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const users = await db.getAllUsers(1000, 0);
  const user = users.find((u) => u.stripeCustomerId === customerId);

  if (!user) {
    console.error("[Stripe] No user found for customer:", customerId);
    return;
  }

  const status = subscription.status;
  const tier = status === "active" || status === "trialing" ? "premium" : "free";

  await db.updateUserSubscription(user.id, {
    subscriptionTier: tier,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: status as any,
    subscriptionStartDate: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000) : undefined,
    subscriptionEndDate: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : undefined,
  });

  console.log(`[Stripe] Updated user ${user.id} subscription to ${tier} (${status})`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log("[Stripe] Subscription canceled:", subscription.id);

  const customerId = subscription.customer as string;

  const users = await db.getAllUsers(1000, 0);
  const user = users.find((u) => u.stripeCustomerId === customerId);

  if (!user) {
    console.error("[Stripe] No user found for customer:", customerId);
    return;
  }

  await db.updateUserSubscription(user.id, {
    subscriptionTier: "free",
    subscriptionStatus: "canceled",
  });

  // Track analytics event
  await db.trackAnalyticsEvent({
    userId: user.id,
    eventType: "subscription_canceled",
    metadata: JSON.stringify({
      subscriptionId: subscription.id,
      canceledAt: new Date().toISOString(),
    }),
  });

  console.log(`[Stripe] User ${user.id} downgraded to free tier`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[Stripe] Invoice paid:", invoice.id);

  const customerId = invoice.customer as string;

  const users = await db.getAllUsers(1000, 0);
  const user = users.find((u) => u.stripeCustomerId === customerId);

  if (!user) {
    console.error("[Stripe] No user found for customer:", customerId);
    return;
  }

  // Ensure user has premium access
  if (user.subscriptionTier !== "premium") {
    await db.updateUserSubscription(user.id, {
      subscriptionTier: "premium",
      subscriptionStatus: "active",
    });
  }

  console.log(`[Stripe] Invoice paid for user ${user.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[Stripe] Invoice payment failed:", invoice.id);

  const customerId = invoice.customer as string;

  const users = await db.getAllUsers(1000, 0);
  const user = users.find((u) => u.stripeCustomerId === customerId);

  if (!user) {
    console.error("[Stripe] No user found for customer:", customerId);
    return;
  }

  await db.updateUserSubscription(user.id, {
    subscriptionStatus: "past_due",
  });

  console.log(`[Stripe] User ${user.id} subscription marked as past_due`);
}
