import {
  DEFAULT_PREFERENCES,
  type WorkspacePreferences,
} from "./types";

const STORAGE_KEY = "fusion-settings-v1";

export function loadPreferences(): WorkspacePreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: WorkspacePreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function clearDemoLocalData(): void {
  if (typeof window === "undefined") return;
  const keys = [
    "fusion-clients-v1",
    "fusion-clients-v2",
    "fusion-projects-v1",
    "fusion-projects-v2",
    "fusion-projects-v3",
    "fusion-hr-v1",
    "fusion-task-projects-v1",
    "fusion-finance-templates-v1",
    "fusion-finance-templates-v2",
    "fusion-finance-quotes-v1",
    "fusion-finance-quotes-v2",
    "fusion-finance-quotes-v3",
    "fusion-finance-invoices-v1",
    "fusion-finance-invoices-v2",
    "fusion-finance-invoices-v3",
    "fusion-finance-expenses-v1",
    "fusion-finance-expenses-v2",
    STORAGE_KEY,
  ];
  for (const key of keys) {
    localStorage.removeItem(key);
  }
  // Also wipe any other fusion-* demo keys still hanging around
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith("fusion-finance-") ||
      key.startsWith("fusion-clients-") ||
      key.startsWith("fusion-projects-")
    ) {
      localStorage.removeItem(key);
    }
  }
}
