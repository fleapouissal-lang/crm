import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AiActionLogInsert,
  Lead,
  LeadQualification,
  SalesAgentSettings,
  ConversationMessage,
} from "@/types/database";
import { DEFAULT_PLAYBOOKS, discoverProfileForProject, type ProjectPlaybook } from "./constants";
import { loadCrmMemory, type CrmMemory } from "./memory";
import { findSimilarExamples, retrieveOlderMessages, type AgentExample } from "./examples";
import { timingNotes } from "./timing";

export type AgentContext = {
  lead: Lead;
  settings: SalesAgentSettings;
  playbook: ProjectPlaybook;
  qualification: LeadQualification | null;
  history: Array<Pick<ConversationMessage, "role" | "body" | "created_at">>;
  conversationId: string | null;
  conversationMode: "ai" | "human" | "paused";
  memory: CrmMemory;
  timingNote: string;
  examples: AgentExample[];
  olderRecalls: Array<{ role: string; body: string; created_at: string }>;
  clarifyCount: number;
};

export async function getOrCreateSettings(
  supabase: SupabaseClient,
  organizationId: string,
  salesProject: string
): Promise<SalesAgentSettings> {
  const project = salesProject.trim() || "Fusion Leap";
  const { data: existing } = await supabase
    .from("sales_agent_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("sales_project", project)
    .maybeSingle();
  if (existing) return existing as SalesAgentSettings;

  const playbook = DEFAULT_PLAYBOOKS[project] ?? DEFAULT_PLAYBOOKS["Fusion Leap"];
  const discover = discoverProfileForProject(project);
  const { data: created, error } = await supabase
    .from("sales_agent_settings")
    .insert({
      organization_id: organizationId,
      sales_project: project,
      enabled: true,
      auto_first_touch: true,
      auto_reply: true,
      require_human_approval: false,
      project_playbook: playbook,
      discover_cities: discover.cities,
      discover_sectors: discover.sectors,
    })
    .select("*")
    .single();
  if (error || !created) {
    throw new Error(error?.message || "Unable to create sales agent settings");
  }
  return created as SalesAgentSettings;
}

export async function logAiAction(
  supabase: SupabaseClient,
  row: AiActionLogInsert
): Promise<void> {
  await supabase.from("ai_action_logs").insert(row);
}

export async function countMessagesLastHours(
  supabase: SupabaseClient,
  organizationId: string,
  hours: number,
  leadId?: string
): Promise<number> {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  let query = supabase
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("status", ["queued", "sending", "sent", "delivered", "replied"])
    .gte("created_at", since);
  if (leadId) query = query.eq("lead_id", leadId);
  const { count } = await query;
  return count ?? 0;
}

export async function buildAgentContext(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string
): Promise<AgentContext> {
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .single();
  if (error || !lead) throw new Error(error?.message || "Lead not found");

  const settings = await getOrCreateSettings(
    supabase,
    organizationId,
    lead.sales_project || "Fusion Leap"
  );
  const playbook = {
    ...(DEFAULT_PLAYBOOKS[settings.sales_project] ?? {}),
    ...((settings.project_playbook as ProjectPlaybook) || {}),
  };

  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id, mode, clarify_count")
    .eq("lead_id", leadId)
    .maybeSingle();

  const { data: qualification } = await supabase
    .from("lead_qualifications")
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();

  let history: AgentContext["history"] = [];
  if (conversation?.id) {
    const { data: messages } = await supabase
      .from("conversation_messages")
      .select("role, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(20);
    history = (messages as AgentContext["history"]) ?? [];
  }

  let memory: CrmMemory = { client: null, quotes: [], invoices: [] };
  try {
    memory = await loadCrmMemory(supabase, organizationId, lead as Lead);
  } catch {
    memory = { client: null, quotes: [], invoices: [] };
  }

  return {
    lead: lead as Lead,
    settings,
    playbook,
    qualification: (qualification as LeadQualification) ?? null,
    history,
    conversationId: conversation?.id ?? null,
    conversationMode: (conversation?.mode as AgentContext["conversationMode"]) ?? "ai",
    memory,
    timingNote: timingNotes(),
    examples: await findSimilarExamples(
      supabase,
      organizationId,
      lead.ai_summary || lead.title || ""
    ).catch(() => []),
    olderRecalls: conversation?.id
      ? await retrieveOlderMessages(
          supabase,
          conversation.id,
          [
            lead.ai_summary,
            lead.title,
            Object.values((lead as Lead).memory_facts || {}).join(" "),
          ]
            .filter(Boolean)
            .join(" ")
        ).catch(() => [])
      : [],
    clarifyCount: Number(conversation?.clarify_count) || 0,
  };
}
