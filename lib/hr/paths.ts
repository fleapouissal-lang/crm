import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";
import type { HrEntry } from "./types";

export function hrMemberPath(memberId: string) {
  return `/hr/${encodeURIComponent(memberId)}`;
}

export function formatHrEntryValue(
  entry: HrEntry,
  h: FusionDictionary["hr"]
) {
  if (entry.type === "bonus" || entry.type === "commission") {
    return `${entry.amount?.toLocaleString() ?? 0} ${entry.currency ?? "MAD"}`;
  }
  if (entry.type === "overtime") return `${entry.hours ?? 0}h`;
  if (entry.type === "leave") return `${entry.days ?? 0} ${h.days.toLowerCase()}`;
  if (entry.type === "lateness") return h.lateness;
  return h.note;
}
