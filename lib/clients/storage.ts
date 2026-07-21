import type { ClientRecord } from "./types";

/** Bumped to drop demo seed previously auto-loaded into v1. */
const STORAGE_KEY = "fusion-clients-v2";

export function loadClients(): ClientRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveClients(clients: ClientRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

export function resetClients(): ClientRecord[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("fusion-clients-v1");
  }
  return [];
}
