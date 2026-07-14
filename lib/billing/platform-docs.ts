import { PLAN_PRICES_EUR, type PlanKey } from "@/lib/billing/plans";
import { PLATFORM_DEFAULT_CURRENCY } from "@/lib/billing/currency";
import type {
  PlatformBillingReason,
  PlatformInvoice,
  PlatformInvoiceStatus,
  PlatformQuote,
  PlatformQuoteStatus,
} from "@/types/database";

export const PLATFORM_QUOTE_STATUSES = [
  "draft",
  "sent",
  "accepted",
  "expired",
  "refused",
] as const;

export const PLATFORM_INVOICE_STATUSES = [
  "draft",
  "pending",
  "paid",
  "overdue",
] as const;

export const QUOTE_STATUS_BADGE: Record<PlatformQuoteStatus, string> = {
  draft: "b-amber",
  sent: "b-blue",
  accepted: "b-green",
  expired: "b-rose",
  refused: "b-gray",
};

export const INVOICE_STATUS_BADGE: Record<PlatformInvoiceStatus, string> = {
  draft: "b-amber",
  pending: "b-blue",
  paid: "b-green",
  overdue: "b-rose",
};

export function formatPlatformMoney(
  amount: number,
  currency: string = PLATFORM_DEFAULT_CURRENCY
): string {
  return `${Number(amount).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function planAmount(plan: PlanKey): number {
  return PLAN_PRICES_EUR[plan] ?? 0;
}

export function nextPlatformDocNumber(
  existing: string[],
  kind: "quote" | "invoice"
): string {
  const year = new Date().getFullYear();
  const prefix = kind === "quote" ? `PLT-DEV-${year}-` : `PLT-FAC-${year}-`;
  const nums = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function defaultDueDate(days = 15): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function defaultPeriodRange(periodEnd?: string | null): {
  period_start: string;
  period_end: string;
} {
  if (periodEnd) {
    const end = new Date(periodEnd);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 1);
    return {
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
    };
  }
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  };
}

export type PlatformQuoteRow = PlatformQuote;
export type PlatformInvoiceRow = PlatformInvoice;
