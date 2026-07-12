const STORAGE_PREFIX = "fusion-notif-read-v1:";
const MAX_IDS = 300;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadReadIds(userId: string): Set<string> {
  if (typeof window === "undefined" || !userId) return new Set();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function saveReadIds(userId: string, ids: Set<string>): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const list = Array.from(ids).slice(-MAX_IDS);
    localStorage.setItem(storageKey(userId), JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

export function markIdsRead(userId: string, ids: string[]): Set<string> {
  const next = loadReadIds(userId);
  for (const id of ids) next.add(id);
  saveReadIds(userId, next);
  return next;
}

export function markIdsUnread(userId: string, ids: string[]): Set<string> {
  const next = loadReadIds(userId);
  for (const id of ids) next.delete(id);
  saveReadIds(userId, next);
  return next;
}
