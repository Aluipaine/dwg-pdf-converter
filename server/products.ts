/**
 * Stripe Products and Prices Configuration
 * Define all subscription products and their pricing here
 */

export const PRODUCTS = {
  PREMIUM_MONTHLY: {
    name: "Premium Monthly",
    description: "Unlimited DWG to PDF conversions with priority processing",
    priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || "price_premium_monthly",
    amount: 2900, // $29.00 in cents
    currency: "usd",
    interval: "month" as const,
    features: [
      "Unlimited conversions",
      "Priority queue processing",
      "Batch file uploads",
      "Extended file storage",
      "Priority support",
    ],
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
