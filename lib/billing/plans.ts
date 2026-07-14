export const PLAN_KEYS = ["free", "starter", "business", "enterprise"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "cancelled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PLAN_PRICES_EUR: Record<PlanKey, number> = {
  free: 0,
  starter: 29,
  business: 79,
  enterprise: 149,
};

export const PLAN_SEAT_LIMITS: Record<PlanKey, number | null> = {
  free: 1,
  starter: 5,
  business: 25,
  enterprise: null,
};

export function isPlanKey(value: string): value is PlanKey {
  return (PLAN_KEYS as readonly string[]).includes(value);
}

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(value);
}

export function formatPlanPrice(
  plan: PlanKey,
  currency: string = "MAD"
): string {
  const amount = PLAN_PRICES_EUR[plan];
  return `${amount} ${currency}`;
}

/** Default trial length for paid plans (days). */
export const DEFAULT_TRIAL_DAYS = 30;

export function defaultTrialEndsAt(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + DEFAULT_TRIAL_DAYS);
  return d.toISOString();
}
