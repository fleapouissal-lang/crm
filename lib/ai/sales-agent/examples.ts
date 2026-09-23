import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentExample = {
  inbound: string;
  reply: string;
};

const STOP = new Set([
  "the", "and", "for", "you", "are", "was", "with", "this", "that",
  "les", "des", "une", "est", "pas", "pour", "vous", "nous", "dans", "plus",
  "من", "على", "هذا", "هذه", "كان", "يكون", "غير", "حتى", "اللي",
  "wach", "bghit", "chno", "ghir", "hadi", "hada",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .slice(0, 12);
}

export async function saveHumanExample(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  reply: string
): Promise<void> {
  const { data: lastProspect } = await supabase
    .from("conversation_messages")
    .select("body")
    .eq("lead_id", leadId)
    .eq("role", "prospect")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const inbound = lastProspect?.body?.trim();
  if (!inbound || inbound.length < 2) return;

  await supabase.from("sales_agent_examples").insert({
    organization_id: organizationId,
    lead_id: leadId,
    inbound: inbound.slice(0, 1200),
    reply: reply.slice(0, 1200),
  });
}

export async function findSimilarExamples(
  supabase: SupabaseClient,
  organizationId: string,
  inbound: string,
  limit = 3
): Promise<AgentExample[]> {
  const { data } = await supabase
    .from("sales_agent_examples")
    .select("inbound, reply")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (!data?.length) return [];

  const keys = new Set(tokens(inbound));
  const scored = data
    .map((row) => {
      const hay = tokens(row.inbound);
      const overlap = hay.filter((w) => keys.has(w)).length;
      return { row, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((x) => x.row);

  if (scored.length) return scored;
  return data.slice(0, Math.min(2, data.length));
}

export async function retrieveOlderMessages(
  supabase: SupabaseClient,
  conversationId: string,
  inbound: string,
  excludeRecent = 20
): Promise<Array<{ role: string; body: string; created_at: string }>> {
  const keys = tokens(inbound);
  const { data } = await supabase
    .from("conversation_messages")
    .select("role, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(400);
  const older = (data || []).slice(excludeRecent);
  if (!older.length) return [];
  if (!keys.length) return older.slice(0, 6).reverse();

  const scored = older
    .map((m) => {
      const hay = m.body.toLowerCase();
      const score = keys.reduce((n, k) => n + (hay.includes(k) ? 1 : 0), 0);
      return { m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((x) => x.m)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return scored.length ? scored : older.slice(0, 4).reverse();
}
