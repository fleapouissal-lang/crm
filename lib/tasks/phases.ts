export const NATUS_TASK_PHASES = ["P0", "P1", "P2", "P3", "P4"] as const;

export function inferTaskPhase(title: string): string | null {
  return title.match(/\b(P\d+)\.\d+\b/i)?.[1]?.toUpperCase() ?? null;
}

export function normalizeTaskPhase(value: string | null | undefined): string | null {
  const phase = value?.trim().toUpperCase() ?? "";
  return /^P\d+$/.test(phase) ? phase : null;
}
