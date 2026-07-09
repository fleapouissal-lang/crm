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
    "fusion-projects-v2",
    "fusion-projects-v1",
    "fusion-hr-v1",
    "fusion-task-projects-v1",
    STORAGE_KEY,
  ];
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}
