import {
  DEFAULT_PREFERENCES,
  type CurrencyCode,
} from "@/lib/settings/types";

/** Platform billing default — same as workspace settings default (MAD). */
export const PLATFORM_DEFAULT_CURRENCY: CurrencyCode =
  DEFAULT_PREFERENCES.currency;

/**
 * Resolve display/storage currency.
 * Legacy docs were stored as EUR before prefs were wired — treat EUR as
 * "unset" and fall back to the workspace preference.
 */
export function resolvePlatformCurrency(
  stored?: string | null,
  preferred: CurrencyCode = PLATFORM_DEFAULT_CURRENCY
): CurrencyCode {
  if (!stored || stored === "EUR") return preferred;
  if (
    stored === "MAD" ||
    stored === "SAR" ||
    stored === "USD" ||
    stored === "KWD" ||
    stored === "EUR"
  ) {
    return stored;
  }
  return preferred;
}

export function currencySymbol(currency: string): string {
  switch (currency) {
    case "EUR":
      return "€";
    case "USD":
      return "$";
    case "MAD":
    case "SAR":
    case "KWD":
    default:
      return currency;
  }
}
