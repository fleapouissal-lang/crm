import { casablancaHour, isWithinSendWindow, randomIntInclusive } from "./language";

const TZ = "Africa/Casablanca";

/** Morocco public holidays (month-day), plus weekly Friday afternoon softness. */
const FIXED_HOLIDAYS = new Set([
  "01-01",
  "01-11",
  "05-01",
  "07-30",
  "08-14",
  "08-20",
  "08-21",
  "11-06",
  "11-18",
]);

export function casablancaWeekday(date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? date.getDay();
}

export function casablancaMonthDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  return `${month}-${day}`;
}

export function isFridaySoft(date = new Date()): boolean {
  return casablancaWeekday(date) === 5 && casablancaHour(date) >= 12;
}

export function isHolidayOrWeekend(date = new Date()): boolean {
  const wd = casablancaWeekday(date);
  if (wd === 0) return true;
  return FIXED_HOLIDAYS.has(casablancaMonthDay(date));
}

export function timingNotes(date = new Date()): string {
  const bits: string[] = [];
  if (isFridaySoft(date)) {
    bits.push("Vendredi après-midi (Casablanca) : ton plus léger, pas de closing agressif, pas de pression.");
  }
  if (isHolidayOrWeekend(date)) {
    bits.push("Jour calme / week-end : message court et respectueux, proposer de reprendre en semaine.");
  }
  return bits.join(" ");
}

function nextWindowStart(startHour: number, from: Date): Date {
  const hour = casablancaHour(from);
  let hoursAhead = startHour - hour;
  if (hoursAhead <= 0) hoursAhead += 24;
  const extraMin = randomIntInclusive(2, 12);
  return new Date(from.getTime() + hoursAhead * 3600_000 + extraMin * 60_000);
}

/** Delay in seconds, then snap outside-window replies to next morning. */
export function computeCommercialDelaySec(input: {
  minSec: number;
  maxSec: number;
  startHour: number;
  endHour: number;
  lastAssistantAt?: string | null;
  now?: Date;
}): { delaySec: number; scheduledFor: Date; fastChat: boolean; deferredToWindow: boolean } {
  const now = input.now ?? new Date();
  const min = Math.max(8, input.minSec);
  const max = Math.max(min, input.maxSec);
  let delay = randomIntInclusive(min, max);
  let fastChat = false;

  if (input.lastAssistantAt) {
    const gapMs = now.getTime() - new Date(input.lastAssistantAt).getTime();
    if (Number.isFinite(gapMs) && gapMs >= 0 && gapMs < 2 * 60_000) {
      fastChat = true;
      delay = randomIntInclusive(Math.min(12, min), Math.max(25, Math.round(min * 0.5)));
    } else if (gapMs < 10 * 60_000) {
      delay = randomIntInclusive(min, Math.round((min + max) / 2));
    }
  }

  let scheduled = new Date(now.getTime() + delay * 1000);
  let deferredToWindow = false;
  if (!isWithinSendWindow(input.startHour, input.endHour, scheduled)) {
    scheduled = nextWindowStart(input.startHour, now);
    delay = Math.max(30, Math.round((scheduled.getTime() - now.getTime()) / 1000));
    deferredToWindow = true;
  }

  return { delaySec: delay, scheduledFor: scheduled, fastChat, deferredToWindow };
}

export function silenceBucketHours(lastContactedAt?: string | null, now = new Date()): number | null {
  if (!lastContactedAt) return null;
  const ms = now.getTime() - new Date(lastContactedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 3600_000);
}

export function relanceAngle(hoursSilent: number | null, sequence: number): string {
  if (hoursSilent == null) {
    return sequence === 1
      ? "Relance courte le jour même / lendemain : vérifier si le sujet intéresse encore."
      : "Nouvel angle (exemple concret), sans insister.";
  }
  if (hoursSilent < 20) {
    return "Silence court (< 20h) : rappel très léger, une question utile, zéro pression.";
  }
  if (hoursSilent < 48) {
    return "Silence ~1-2 jours : check-in amical + valeur (exemple / option MVP).";
  }
  if (hoursSilent < 120) {
    return "Silence plusieurs jours : changer d'angle (cas client, question métier), proposer RDV court.";
  }
  return "Silence long : message de clôture douce — archiver si pas d'intérêt, laisser la porte ouverte.";
}
