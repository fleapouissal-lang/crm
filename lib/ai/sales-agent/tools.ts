import type { SupabaseClient } from "@supabase/supabase-js";
import { nextQuoteNumber, type QuoteRecord } from "@/lib/finance/types";
import { quoteToRow } from "@/lib/finance/db";
import type { Lead } from "@/types/database";

export type FreeSlot = {
  starts: Date;
  ends: Date;
  label: string;
};

function casablancaParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Casablanca",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return parts as Record<string, string>;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export async function nextFreeSlots(
  supabase: SupabaseClient,
  organizationId: string,
  count = 3
): Promise<FreeSlot[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 10 * 24 * 3600_000);
  const { data: busy } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("organization_id", organizationId)
    .in("status", ["proposed", "confirmed"])
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizon.toISOString());

  const busyRanges = (busy || []).map((r) => ({
    start: new Date(r.starts_at),
    end: new Date(r.ends_at),
  }));

  const slots: FreeSlot[] = [];
  for (let day = 1; day <= 10 && slots.length < count; day += 1) {
    const base = new Date(now.getTime() + day * 24 * 3600_000);
    const wd = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Casablanca",
      weekday: "short",
    }).format(base);
    if (wd === "Sun" || wd === "Sat") continue;
    for (const hour of [10, 15]) {
      if (wd === "Fri" && hour >= 15) continue;
      const ymd = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Casablanca",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(base);
      const starts = new Date(`${ymd}T${String(hour).padStart(2, "0")}:00:00+01:00`);
      const ends = new Date(starts.getTime() + 30 * 60_000);
      if (starts <= now) continue;
      const taken = busyRanges.some((b) => overlaps(starts, ends, b.start, b.end));
      if (taken) continue;
      const p = casablancaParts(starts);
      slots.push({
        starts,
        ends,
        label: `${p.weekday} ${p.day}/${p.month} à ${p.hour}:${p.minute}`,
      });
      if (slots.length >= count) break;
    }
  }
  return slots;
}

export async function insertProposedMeetings(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  slots: FreeSlot[]
) {
  for (const slot of slots.slice(0, 2)) {
    await supabase.from("appointments").insert({
      organization_id: organizationId,
      lead_id: leadId,
      type: "online",
      status: "proposed",
      starts_at: slot.starts.toISOString(),
      ends_at: slot.ends.toISOString(),
      reminder_at: new Date(slot.starts.getTime() - 2 * 3600_000).toISOString(),
      notes: "Proposé par l'agent (créneau libre)",
    });
  }
}

export async function createAgentQuote(
  supabase: SupabaseClient,
  organizationId: string,
  lead: Lead,
  amount: number,
  service: string
): Promise<{ number: string } | { error: string }> {
  if (!Number.isFinite(amount) || amount < 500) {
    return { error: "Montant devis trop bas ou invalide" };
  }
  const { data: existingQuotes } = await supabase
    .from("quotes")
    .select("number")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);
  const number = nextQuoteNumber(
    (existingQuotes || []).map((q) => ({ number: q.number }) as QuoteRecord)
  );
  const now = new Date().toISOString();
  const quote: QuoteRecord = {
    id: crypto.randomUUID(),
    number,
    clientName: lead.company || lead.contact_name || lead.title,
    clientType: "pro",
    service: service.trim() || "Proposition commerciale",
    amount,
    currency: "MAD",
    validityDays: 15,
    status: "sent",
    templateId: null,
    notes: `Agent WhatsApp — lead ${lead.title}`,
    items: [
      {
        id: crypto.randomUUID(),
        description: service.trim() || "Prestation",
        quantity: 1,
        unitPriceTtc: amount,
      },
    ],
    leadId: lead.id,
    createdAt: now,
    updatedAt: now,
  };
  const row = quoteToRow(quote, organizationId);
  const { id: _unusedId, ...insert } = row;
  void _unusedId;
  const { error } = await supabase.from("quotes").insert(insert);
  if (error) return { error: error.message };
  await supabase
    .from("leads")
    .update({ sales_status: "proposal_sent", stage: "proposal", value: amount })
    .eq("id", lead.id)
    .eq("organization_id", organizationId);
  return { number };
}

export const PORTFOLIO_LINKS: Record<string, Array<{ title: string; url: string }>> = {
  "Fusion Leap": [
    { title: "Fusion Leap", url: "https://fusionleap.ma" },
  ],
  Evana: [
    { title: "Fusion Leap", url: "https://fusionleap.ma" },
  ],
  Autolog: [{ title: "Autolog", url: "https://autolog.ma" }],
};

export function portfolioMessage(project: string): string {
  const links = PORTFOLIO_LINKS[project] || PORTFOLIO_LINKS["Fusion Leap"];
  return links.map((l) => `${l.title}: ${l.url}`).join("\n");
}
