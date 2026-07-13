// ──────────────────────────────────────────────────────────
// PRODUCT CONFIG  —  change PRODUCT_NAME here to rebrand everywhere
// ──────────────────────────────────────────────────────────
export const PRODUCT_NAME    = 'ShreemHR';
export const PRODUCT_TAGLINE = 'Hotel workforce management — without the enterprise price tag.';
export const PRODUCT_DOMAIN  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shreemhr.com';

export const TRIAL_DAYS = 14;

// ── Billing Plans ─────────────────────────────────────────
// priceId values must match Stripe Price IDs set in .env.local
export const PLANS = {
  trial: {
    label:          'Trial',
    description:    '14-day free trial — no card required',
    priceId:        null,
    pricePerSeat:   0,
    flatMonthly:    0,
    seatLimit:      999,   // unlimited during trial
    propertyLimit:  999,
  },
  starter: {
    label:          'Starter',
    description:    'Perfect for 1–3 properties',
    priceId:        process.env.STRIPE_PRICE_STARTER ?? '',
    pricePerSeat:   5,     // $5/employee/month
    flatMonthly:    0,     // true per-seat (no flat fee)
    seatLimit:      50,
    propertyLimit:  3,
  },
  growth: {
    label:          'Growth',
    description:    'Ideal for 4–10 properties',
    priceId:        process.env.STRIPE_PRICE_GROWTH ?? '',
    pricePerSeat:   4,     // $4/employee/month
    flatMonthly:    0,
    seatLimit:      200,
    propertyLimit:  10,
  },
  enterprise: {
    label:          'Enterprise',
    description:    'Unlimited properties & employees',
    priceId:        process.env.STRIPE_PRICE_ENTERPRISE ?? '',
    pricePerSeat:   3,     // $3/employee/month
    flatMonthly:    0,
    seatLimit:      null,  // null = unlimited
    propertyLimit:  null,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// Subscription states
export type SubStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';

export function isPlanActive(status: SubStatus | null, trialEndsAt: string | null): boolean {
  if (status === 'active' || status === 'trialing') return true;
  if (!status && trialEndsAt) {
    // Legacy trial check
    const graceDays = 7;
    const graceEnd = new Date(trialEndsAt);
    graceEnd.setDate(graceEnd.getDate() + graceDays);
    return new Date() <= graceEnd;
  }
  return false;
}

export function isInGracePeriod(status: SubStatus | null, trialEndsAt: string | null): boolean {
  if (status === 'past_due' || status === 'unpaid') return true;
  if (!status && trialEndsAt) {
    const now = new Date();
    const trialEnd = new Date(trialEndsAt);
    const graceEnd = new Date(trialEndsAt);
    graceEnd.setDate(graceEnd.getDate() + 7);
    return now > trialEnd && now <= graceEnd;
  }
  return false;
}

export function trialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
