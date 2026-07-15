import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";
import type { HrEntry } from "./types";
import { format } from "date-fns";

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
  if (entry.type === "leave") {
    const days = entry.days ?? 0;
    const dayLabel = h.days.toLowerCase();
    if (entry.endDate && entry.endDate !== entry.date) {
      const start = format(new Date(entry.date + "T00:00:00"), "dd MMM yyyy");
      const end = format(new Date(entry.endDate + "T00:00:00"), "dd MMM yyyy");
      return `${start} → ${end} · ${days} ${dayLabel}`;
    }
    return `${days} ${dayLabel}`;
  }
  if (entry.type === "lateness") {
    if (entry.minutes && entry.minutes > 0) {
      return `${h.lateness} · ${entry.minutes} ${h.minutes.toLowerCase()}`;
    }
    return h.lateness;
  }
  if (entry.type === "note") {
    return entry.note?.trim() || "—";
  }
  return entry.note?.trim() || h.note;
}
