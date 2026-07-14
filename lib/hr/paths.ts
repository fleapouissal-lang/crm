import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";
import type { HrEntry } from "./types";

export function hrMemberPath(memberId: string) {
  return `/hr/${encodeURIComponent(memberId)}`;
}

export function hrSalaryPath(memberId: string) {
  return `/hr/${encodeURIComponent(memberId)}/salary`;
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
  if (entry.type === "lateness") {
    if (entry.minutes && entry.minutes > 0) {
      return `${h.lateness} · ${entry.minutes} ${h.minutes.toLowerCase()}`;
    }
    return h.lateness;
  }
  return h.note;
}
