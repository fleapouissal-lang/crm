import type { ClientRecord } from "./types";
import { SEED_CLIENTS } from "./seed";

const STORAGE_KEY = "fusion-clients-v1";

export function loadClients(): ClientRecord[] {
  if (typeof window === "undefined") return SEED_CLIENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_CLIENTS;
    const parsed = JSON.parse(raw) as ClientRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_CLIENTS;
  } catch {
    return SEED_CLIENTS;
  }
}

export function saveClients(clients: ClientRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

export function resetClients(): ClientRecord[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [...SEED_CLIENTS];
}
