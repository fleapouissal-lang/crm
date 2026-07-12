export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["card", "transfer", "cash", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CARD_BRANDS = [
  "visa",
  "mastercard",
  "amex",
  "discover",
  "paypal",
  "other",
] as const;
export type CardBrand = (typeof CARD_BRANDS)[number];

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, string> = {
  pending: "b-amber",
  processing: "b-blue",
  succeeded: "b-green",
  failed: "b-rose",
  refunded: "b-gray",
};

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isCardBrand(value: string): value is CardBrand {
  return (CARD_BRANDS as readonly string[]).includes(value);
}

export function nextPaymentNumber(existing: string[]): string {
  const year = new Date().getFullYear();
  const prefix = `PLT-PAY-${year}-`;
  const nums = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function maskLast4(value: string): string {
  const digits = value.replace(/\D/g, "").slice(-4);
  return digits.padStart(4, "0").slice(-4);
}
