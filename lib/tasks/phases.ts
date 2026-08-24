import type { ProjectDeliveryPhase } from "@/lib/projects/types";

export function normalizeProjectDeliveryPhases(
  value: unknown
): ProjectDeliveryPhase[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as { code?: unknown; label?: unknown };
    const code = normalizeTaskPhase(typeof raw.code === "string" ? raw.code : null);
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    if (!code || !label || seen.has(code)) return [];
    seen.add(code);
    return [{ code, label }];
  });
}

export function parseProjectDeliveryPhases(value: string): ProjectDeliveryPhase[] {
  const seen = new Set<string>();
  return value.split(/\r?\n/).flatMap((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return [];
    const match = trimmed.match(/^(P\d+)\s*[|:·-]\s*(.+)$/i);
    const code = normalizeTaskPhase(match?.[1] ?? `P${index}`);
    const label = (match?.[2] ?? trimmed).trim();
    if (!code || !label || seen.has(code)) return [];
    seen.add(code);
    return [{ code, label }];
  });
}

export function serializeProjectDeliveryPhases(
  phases: ProjectDeliveryPhase[]
): string {
  return normalizeProjectDeliveryPhases(phases)
    .map((phase) => `${phase.code} | ${phase.label}`)
    .join("\n");
}

export function inferTaskPhase(title: string): string | null {
  return title.match(/\b(P\d+)\.\d+\b/i)?.[1]?.toUpperCase() ?? null;
}

export function normalizeTaskPhase(value: string | null | undefined): string | null {
  const phase = value?.trim().toUpperCase() ?? "";
  return /^P\d+$/.test(phase) ? phase : null;
}
