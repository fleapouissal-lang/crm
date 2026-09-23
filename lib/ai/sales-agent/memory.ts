import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "@/types/database";
import { generateSalesAgentText, isSalesAgentConfigured } from "./client";

export type CrmMemory = {
  client: {
    id: string;
    name: string;
    status_key: string;
    location: string;
    engagement: string;
    value_amount: number | null;
  } | null;
  quotes: Array<{ number: string; service: string; amount: number; status: string }>;
  invoices: Array<{ number: string; amount: number; status: string }>;
};

function digits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function samePhone(a: string, b: string): boolean {
  const left = digits(a);
  const right = digits(b);
  if (!left || !right || left.length < 8 || right.length < 8) return false;
  return left === right || left.slice(-9) === right.slice(-9);
}

export async function matchAndLinkClient(
  supabase: SupabaseClient,
  organizationId: string,
  lead: Lead
): Promise<CrmMemory["client"]> {
  if (lead.client_id) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, status_key, location, engagement, value_amount")
      .eq("id", lead.client_id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    return (data as CrmMemory["client"]) ?? null;
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, contact, status_key, location, engagement, value_amount")
    .eq("organization_id", organizationId)
    .limit(400);

  const email = (lead.email || "").trim().toLowerCase();
  const company = (lead.company || lead.title || "").trim().toLowerCase();
  const hit = (clients || []).find((c) => {
    if (lead.phone && samePhone(lead.phone, c.contact)) return true;
    if (email && String(c.contact || "").toLowerCase().includes(email)) return true;
    const name = String(c.name || "").trim().toLowerCase();
    return Boolean(company && name && (name === company || name.includes(company) || company.includes(name)));
  });

  if (!hit) return null;

  await supabase
    .from("leads")
    .update({ client_id: hit.id })
    .eq("id", lead.id)
    .eq("organization_id", organizationId);

  return {
    id: hit.id,
    name: hit.name,
    status_key: hit.status_key,
    location: hit.location,
    engagement: hit.engagement,
    value_amount: hit.value_amount,
  };
}

export async function loadCrmMemory(
  supabase: SupabaseClient,
  organizationId: string,
  lead: Lead
): Promise<CrmMemory> {
  const client = await matchAndLinkClient(supabase, organizationId, lead);
  let quotesQuery = supabase
    .from("quotes")
    .select("number, service, amount, status, lead_id, client_id, client_name")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (client?.id) quotesQuery = quotesQuery.or(`client_id.eq.${client.id},lead_id.eq.${lead.id}`);
  else quotesQuery = quotesQuery.eq("lead_id", lead.id);
  const { data: quotes } = await quotesQuery;

  let invoices: CrmMemory["invoices"] = [];
  if (client?.id) {
    const { data } = await supabase
      .from("invoices")
      .select("number, amount, status")
      .eq("organization_id", organizationId)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(5);
    invoices = (data || []).map((i) => ({
      number: i.number,
      amount: Number(i.amount) || 0,
      status: i.status,
    }));
  }

  return {
    client,
    quotes: (quotes || []).map((q) => ({
      number: q.number,
      service: q.service,
      amount: Number(q.amount) || 0,
      status: q.status,
    })),
    invoices,
  };
}

export async function refreshLeadMemory(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  input: {
    inbound: string;
    action: string;
    qualification?: {
      need?: string | null;
      budget?: string | null;
      timeline?: string | null;
      objections?: string[] | null;
    } | null;
    previousSummary?: string | null;
    previousFacts?: Record<string, string> | null;
  }
): Promise<void> {
  const seedFacts: Record<string, string> = { ...(input.previousFacts || {}) };
  if (input.qualification?.need) seedFacts.besoin = input.qualification.need;
  if (input.qualification?.budget) seedFacts.budget = input.qualification.budget;
  if (input.qualification?.timeline) seedFacts.delai = input.qualification.timeline;
  if (input.qualification?.objections?.length) {
    seedFacts.objection = input.qualification.objections.slice(0, 3).join(" · ");
  }

  if (!isSalesAgentConfigured()) {
    const line = `[${new Date().toISOString().slice(0, 10)}] ${input.action}: ${input.inbound.slice(0, 160)}`;
    const next = [input.previousSummary?.trim(), line].filter(Boolean).join("\n").slice(-2800);
    await supabase
      .from("leads")
      .update({
        ai_summary: next,
        memory_facts: Object.fromEntries(
          Object.entries(seedFacts).filter(([, v]) => Boolean(v && String(v).trim()))
        ),
      })
      .eq("id", leadId)
      .eq("organization_id", organizationId);
    return;
  }

  try {
    const raw = await generateSalesAgentText({
      maxTokens: 400,
      system:
        'Réponds UNIQUEMENT en JSON: {"summary":"mémo 12 lignes max","facts":{"besoin":"","budget":"","delai":"","decideur":"","objection":"","stack":"","prochaine_etape":""}}. Garde les faits anciens si toujours vrais. Pas de texte hors JSON.',
      user: JSON.stringify({
        previous_summary: input.previousSummary || "",
        previous_facts: input.previousFacts || {},
        last_inbound: input.inbound.slice(0, 500),
        action: input.action,
        qualification: input.qualification || null,
      }),
    });
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    let parsed: { summary?: string; facts?: Record<string, string> } | null = null;
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(raw.slice(start, end + 1)) as {
          summary?: string;
          facts?: Record<string, string>;
        };
      } catch {
        parsed = null;
      }
    }
    const summary = (parsed?.summary || raw).slice(0, 3000);
    const facts = {
      ...seedFacts,
      ...(parsed?.facts || {}),
    };
    await supabase
      .from("leads")
      .update({
        ai_summary: summary,
        memory_facts: Object.fromEntries(
          Object.entries(facts).filter(([, v]) => Boolean(v && String(v).trim()))
        ),
      })
      .eq("id", leadId)
      .eq("organization_id", organizationId);
  } catch {
    /* keep previous summary */
  }
}
