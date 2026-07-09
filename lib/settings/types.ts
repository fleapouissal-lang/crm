export type CurrencyCode = "USD" | "MAD" | "SAR" | "EUR" | "KWD";

export type TimezoneId =
  | "Africa/Casablanca"
  | "Asia/Riyadh"
  | "Asia/Dubai"
  | "Europe/Paris"
  | "UTC";

export interface WorkspacePreferences {
  currency: CurrencyCode;
  timezone: TimezoneId;
  emailNotifications: boolean;
  activityDigest: boolean;
  taskReminders: boolean;
  leadAlerts: boolean;
}

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  currency: "MAD",
  timezone: "Africa/Casablanca",
  emailNotifications: true,
  activityDigest: false,
  taskReminders: true,
  leadAlerts: true,
};

export const CURRENCY_OPTIONS: CurrencyCode[] = [
  "MAD",
  "SAR",
  "USD",
  "EUR",
  "KWD",
];

export const TIMEZONE_OPTIONS: TimezoneId[] = [
  "Africa/Casablanca",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Europe/Paris",
  "UTC",
];
