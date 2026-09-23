"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessLeads, isLeadership } from "@/lib/permissions";
import {
  getOrCreateSettings,
  sendFirstTouchAuto,
} from "@/lib/ai/sales-agent/runtime";
import {
  DEFAULT_PLAYBOOKS,
  discoverProfileForProject,
} from "@/lib/ai/sales-agent/constants";
import type {
  ActionResult,
  AiConversation,
  Appointment,
  ConversationMessage,
  LeadQualification,
  SalesAgentSettings,
} from "@/types/database";

const idSchema = z.string().uuid();

export async function getSalesAgentSettings(
  salesProject = "Fusion Leap"
): Promise<SalesAgentSettings | null> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) return null;
  const supabase = await createClient();
  try {
    return await getOrCreateSettings(
      supabase,
      profile.organization_id,
      salesProject
    );
  } catch {
    return null;
  }
}

const settingsSchema = z.object({
  sales_project: z.string().min(1).max(120),
  enabled: z.boolean(),
  auto_first_touch: z.boolean(),
  auto_reply: z.boolean(),
  require_human_approval: z.boolean(),
  max_msgs_per_lead_day: z.number().int().min(1).max(50),
  max_msgs_per_org_hour: z.number().int().min(1).max(500),
  require_opt_in_mode: z.boolean(),
  handoff_assignee_id: z.string().uuid().nullable(),
  relance_delays_hours: z.array(z.number().int().min(1).max(168)).min(1).max(5),
  project_playbook: z.record(z.string(), z.unknown()).optional(),
  match_prospect_language: z.boolean().default(true),
  reply_delay_min_sec: z.number().int().min(0).max(900).default(45),
  reply_delay_max_sec: z.number().int().min(0).max(1800).default(180),
  first_touch_stagger_min_sec: z.number().int().min(0).max(3600).default(90),
  first_touch_stagger_max_sec: z.number().int().min(0).max(7200).default(420),
  daily_first_touch_limit: z.number().int().min(0).max(200).default(30),
  auto_discover: z.boolean().default(false),
  daily_discover_limit: z.number().int().min(0).max(100).default(20),
  discover_cities: z.array(z.string().min(1).max(80)).max(12).default([]),
  discover_sectors: z.array(z.string().min(1).max(80)).max(20).default([]),
  send_window_start_hour: z.number().int().min(0).max(23).default(9),
  send_window_end_hour: z.number().int().min(0).max(23).default(21),
});

export async function updateSalesAgentSettings(
  input: z.infer<typeof settingsSchema>
): Promise<ActionResult<SalesAgentSettings>> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid settings" };
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isLeadership(profile)) {
    return { success: false, error: "Only leadership can update agent settings" };
  }
  const supabase = await createClient();
  const playbook =
    parsed.data.project_playbook ||
    DEFAULT_PLAYBOOKS[parsed.data.sales_project] ||
    DEFAULT_PLAYBOOKS["Fusion Leap"];
  const { data, error } = await supabase
    .from("sales_agent_settings")
    .upsert(
      {
        organization_id: profile.organization_id,
        sales_project: parsed.data.sales_project,
        enabled: parsed.data.enabled,
        auto_first_touch: parsed.data.auto_first_touch,
        auto_reply: parsed.data.auto_reply,
        require_human_approval: parsed.data.require_human_approval,
        max_msgs_per_lead_day: parsed.data.max_msgs_per_lead_day,
        max_msgs_per_org_hour: parsed.data.max_msgs_per_org_hour,
        require_opt_in_mode: parsed.data.require_opt_in_mode,
        handoff_assignee_id: parsed.data.handoff_assignee_id,
        relance_delays_hours: parsed.data.relance_delays_hours,
        project_playbook: playbook,
        match_prospect_language: parsed.data.match_prospect_language,
        reply_delay_min_sec: parsed.data.reply_delay_min_sec,
        reply_delay_max_sec: Math.max(
          parsed.data.reply_delay_min_sec,
          parsed.data.reply_delay_max_sec
        ),
        first_touch_stagger_min_sec: parsed.data.first_touch_stagger_min_sec,
        first_touch_stagger_max_sec: Math.max(
          parsed.data.first_touch_stagger_min_sec,
          parsed.data.first_touch_stagger_max_sec
        ),
        daily_first_touch_limit: parsed.data.daily_first_touch_limit,
        auto_discover: parsed.data.auto_discover,
        daily_discover_limit: parsed.data.daily_discover_limit,
        discover_cities:
          parsed.data.discover_cities.length > 0
            ? parsed.data.discover_cities
            : discoverProfileForProject(parsed.data.sales_project).cities,
        discover_sectors:
          parsed.data.discover_sectors.length > 0
            ? parsed.data.discover_sectors
            : discoverProfileForProject(parsed.data.sales_project).sectors,
        send_window_start_hour: parsed.data.send_window_start_hour,
        send_window_end_hour: parsed.data.send_window_end_hour,
      },
      { onConflict: "organization_id,sales_project" }
    )
    .select("*")
    .single();
  if (error || !data) return { success: false, error: error?.message || "Save failed" };
  revalidatePath("/settings");
  revalidatePath("/leads");
  return { success: true, data: data as SalesAgentSettings };
}

export async function triggerFirstTouch(
  leadId: string
): Promise<ActionResult<{ messageId: string }>> {
  const parsed = idSchema.safeParse(leadId);
  if (!parsed.success) return { success: false, error: "Invalid lead id" };
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isLeadership(profile)) {
    return { success: false, error: "Only leadership can trigger first touch" };
  }
  const supabase = createAdminClient();
  const result = await sendFirstTouchAuto(
    supabase,
    profile.organization_id,
    parsed.data,
    profile.id
  );
  if (!result.success) return { success: false, error: result.error };
  revalidatePath("/leads");
  return { success: true, data: { messageId: result.messageId } };
}

export async function getLeadConversation(leadId: string): Promise<{
  conversation: AiConversation | null;
  messages: ConversationMessage[];
  qualification: LeadQualification | null;
}> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) {
    return { conversation: null, messages: [], qualification: null };
  }
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("lead_id", leadId)
    .maybeSingle();
  const { data: messages } = conversation
    ? await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true })
        .limit(100)
    : { data: [] };
  const { data: qualification } = await supabase
    .from("lead_qualifications")
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();
  return {
    conversation: (conversation as AiConversation) ?? null,
    messages: (messages as ConversationMessage[]) ?? [],
    qualification: (qualification as LeadQualification) ?? null,
  };
}

export async function takeOverConversation(
  leadId: string,
  mode: "human" | "ai" | "paused" = "human"
): Promise<ActionResult<AiConversation>> {
  const parsed = idSchema.safeParse(leadId);
  if (!parsed.success) return { success: false, error: "Invalid lead id" };
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) {
    return { success: false, error: "Not allowed" };
  }
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("lead_id", parsed.data)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  let data: AiConversation | null = null;
  if (existing?.id) {
    const updated = await supabase
      .from("ai_conversations")
      .update({
        mode,
        assigned_to: profile.id,
        handoff_reason: mode === "human" ? "Manual take-over" : null,
        urgent: false,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    data = updated.data as AiConversation;
  } else {
    const created = await supabase
      .from("ai_conversations")
      .insert({
        organization_id: profile.organization_id,
        lead_id: parsed.data,
        mode,
        assigned_to: profile.id,
        handoff_reason: mode === "human" ? "Manual take-over" : null,
      })
      .select("*")
      .single();
    data = created.data as AiConversation;
  }
  if (!data) return { success: false, error: "Unable to update conversation" };
  if (mode === "human") {
    await supabase
      .from("outreach_relances")
      .update({ status: "cancelled", response_received_at: new Date().toISOString() })
      .eq("lead_id", parsed.data)
      .eq("status", "planned");
  }
  revalidatePath("/leads");
  return { success: true, data };
}

export async function sendHumanConversationMessage(
  leadId: string,
  body: string
): Promise<ActionResult> {
  const text = body.trim();
  if (!text) return { success: false, error: "Empty message" };
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) {
    return { success: false, error: "Not allowed" };
  }
  const supabase = createAdminClient();
  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id, mode")
    .eq("lead_id", leadId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (!conversation) return { success: false, error: "No conversation" };

  const { dispatchOutreachMessage } = await import("@/lib/outreach/dispatch");
  const { data: message, error } = await supabase
    .from("outreach_messages")
    .insert({
      organization_id: profile.organization_id,
      lead_id: leadId,
      channel: "whatsapp",
      status: "queued",
      body: text,
      message_parts: [text],
      created_by: profile.id,
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      idempotency_key: `human-${leadId}-${Date.now()}`,
      provider: "easytouch",
    })
    .select("id")
    .single();
  if (error || !message) return { success: false, error: error?.message || "Queue failed" };

  const result = await dispatchOutreachMessage(
    supabase,
    profile.organization_id,
    message.id
  );
  if (!result.success) return { success: false, error: result.error };

  const { saveHumanExample } = await import("@/lib/ai/sales-agent/examples");
  await saveHumanExample(supabase, profile.organization_id, leadId, text).catch(() => undefined);

  await supabase.from("conversation_messages").insert({
    organization_id: profile.organization_id,
    conversation_id: conversation.id,
    lead_id: leadId,
    role: "human",
    body: text,
    outreach_message_id: message.id,
    provider_message_id: result.providerMessageId,
  });
  await supabase
    .from("ai_conversations")
    .update({
      mode: "human",
      last_message_at: new Date().toISOString(),
      assigned_to: profile.id,
      urgent: false,
    })
    .eq("id", conversation.id);

  revalidatePath("/leads");
  return { success: true, data: undefined };
}

export async function listHandoffConversations(): Promise<AiConversation[]> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select(
      "*, lead:leads(id, title, company, contact_name, sales_project)"
    )
    .eq("organization_id", profile.organization_id)
    .eq("mode", "human")
    .order("urgent", { ascending: false })
    .order("last_message_at", { ascending: false })
    .limit(50);
  return (data as AiConversation[]) ?? [];
}

export async function listAppointments(): Promise<Appointment[]> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("*, lead:leads(id, title, contact_name, company, phone)")
    .eq("organization_id", profile.organization_id)
    .order("starts_at", { ascending: true })
    .limit(200);
  return (data as Appointment[]) ?? [];
}

export async function getAppointmentsForLead(leadId: string): Promise<Appointment[]> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("lead_id", leadId)
    .order("starts_at", { ascending: true });
  return (data as Appointment[]) ?? [];
}

export async function upsertAppointment(input: {
  id?: string;
  lead_id: string;
  type: "online" | "onsite";
  status?: Appointment["status"];
  starts_at: string;
  ends_at: string;
  meet_url?: string | null;
  location?: string | null;
  notes?: string | null;
}): Promise<ActionResult<Appointment>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) {
    return { success: false, error: "Not allowed" };
  }
  const supabase = await createClient();
  const reminder = new Date(new Date(input.starts_at).getTime() - 2 * 3600_000).toISOString();
  if (input.id) {
    const { data, error } = await supabase
      .from("appointments")
      .update({
        type: input.type,
        status: input.status || "proposed",
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        meet_url: input.meet_url ?? null,
        location: input.location ?? null,
        notes: input.notes ?? null,
        reminder_at: reminder,
        confirmed_at: input.status === "confirmed" ? new Date().toISOString() : null,
      })
      .eq("id", input.id)
      .eq("organization_id", profile.organization_id)
      .select("*")
      .single();
    if (error || !data) return { success: false, error: error?.message || "Update failed" };
    if (input.status === "confirmed") {
      await supabase
        .from("leads")
        .update({ sales_status: "meeting_confirmed", stage: "negotiation" })
        .eq("id", input.lead_id);
    }
    revalidatePath("/leads");
    revalidatePath("/calendar");
    return { success: true, data: data as Appointment };
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      organization_id: profile.organization_id,
      lead_id: input.lead_id,
      type: input.type,
      status: input.status || "proposed",
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      meet_url: input.meet_url ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      reminder_at: reminder,
      created_by: profile.id,
    })
    .select("*")
    .single();
  if (error || !data) return { success: false, error: error?.message || "Create failed" };
  await supabase
    .from("leads")
    .update({ sales_status: "meeting_proposed", stage: "negotiation" })
    .eq("id", input.lead_id);
  revalidatePath("/leads");
  return { success: true, data: data as Appointment };
}

export async function researchLeadNow(
  leadId: string
): Promise<ActionResult<{ notes: string | null }>> {
  const parsed = idSchema.safeParse(leadId);
  if (!parsed.success) return { success: false, error: "Invalid lead id" };
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !canAccessLeads(profile)) {
    return { success: false, error: "Not allowed" };
  }
  const supabase = await createClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", parsed.data)
    .eq("organization_id", profile.organization_id)
    .single();
  if (error || !lead) return { success: false, error: "Lead not found" };

  const { researchLeadIfNeeded } = await import("@/lib/ai/sales-agent/research");
  const notes = await researchLeadIfNeeded(
    supabase,
    profile.organization_id,
    lead as import("@/types/database").Lead,
    { force: true }
  );
  revalidatePath(`/leads/${parsed.data}`);
  revalidatePath("/leads");
  return { success: true, data: { notes } };
}

export async function runProspectDiscoveryNow(
  salesProject = "Fusion Leap"
): Promise<
  ActionResult<{ created: number; enriched: number; skipped: number }>
> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isLeadership(profile)) {
    return { success: false, error: "Only leadership can run discovery" };
  }
  const supabase = createAdminClient();
  const projects =
    salesProject === "all"
      ? ["Fusion Leap", "Autolog", "Evana"]
      : [salesProject.trim() || "Fusion Leap"];

  const { processAutoDiscoverProspects } = await import(
    "@/lib/ai/sales-agent/discover"
  );
  let created = 0;
  let enriched = 0;
  let skipped = 0;

  for (const project of projects) {
    const settings = await getOrCreateSettings(
      supabase,
      profile.organization_id,
      project
    );
    const discoverDefaults = discoverProfileForProject(project);
    const result = await processAutoDiscoverProspects(
      supabase,
      profile.organization_id,
      {
        salesProject: project,
        dailyLimit: settings.daily_discover_limit ?? 20,
        cities:
          settings.discover_cities?.length
            ? settings.discover_cities
            : discoverDefaults.cities,
        sectors:
          settings.discover_sectors?.length
            ? settings.discover_sectors
            : discoverDefaults.sectors,
        enrichResearch: true,
      }
    );
    created += result.created;
    enriched += result.enriched;
    skipped += result.skipped;
  }

  revalidatePath("/leads");
  return {
    success: true,
    data: { created, enriched, skipped },
  };
}

/**
 * Delete untouched auto_discover leads that look like directories / low quality.
 * Never deletes contacted / messaged leads.
 */
export async function deleteJunkDiscoveredLeads(
  salesProject = "Fusion Leap"
): Promise<ActionResult<{ deleted: number; rescored: number }>> {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isLeadership(profile)) {
    return { success: false, error: "Only leadership can clean junk leads" };
  }

  const {
    JUNK_SCORE_MAX,
    scoreFromLead,
  } = await import("@/lib/ai/sales-agent/lead-quality");

  const supabase = createAdminClient();
  const orgId = profile.organization_id;
  const projects =
    salesProject === "all"
      ? ["Fusion Leap", "Autolog", "Evana"]
      : [salesProject.trim() || "Fusion Leap"];

  const query = supabase
    .from("leads")
    .select(
      "id, company, title, phone, phone_normalized, email, website, source_url, city, memory_facts, research_notes, ai_score, sales_status, stage, sales_project"
    )
    .eq("organization_id", orgId)
    .eq("source", "auto_discover")
    .eq("stage", "new")
    .in("sales_project", projects)
    .limit(500);

  const { data: rows, error } = await query;
  if (error) return { success: false, error: error.message };

  const candidates = (rows || []).filter((row) => {
    const status = row.sales_status || row.stage;
    return status === "new";
  });

  if (candidates.length === 0) {
    return { success: true, data: { deleted: 0, rescored: 0 } };
  }

  const ids = candidates.map((r) => r.id);
  const { data: touched } = await supabase
    .from("outreach_messages")
    .select("lead_id")
    .eq("organization_id", orgId)
    .in("lead_id", ids)
    .in("status", ["queued", "sending", "sent", "delivered", "replied"]);
  const touchedSet = new Set((touched || []).map((t) => t.lead_id));

  const toDelete: string[] = [];
  let rescored = 0;

  for (const row of candidates) {
    if (touchedSet.has(row.id)) continue;
    const quality = scoreFromLead(row as import("@/types/database").Lead);
    if (quality.junk || quality.score <= JUNK_SCORE_MAX) {
      toDelete.push(row.id);
      continue;
    }
    if (row.ai_score !== quality.score) {
      await supabase
        .from("leads")
        .update({ ai_score: quality.score })
        .eq("id", row.id)
        .eq("organization_id", orgId);
      rescored += 1;
    }
  }

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("leads")
      .delete()
      .eq("organization_id", orgId)
      .in("id", toDelete);
    if (delErr) return { success: false, error: delErr.message };
  }

  revalidatePath("/leads");
  return {
    success: true,
    data: { deleted: toDelete.length, rescored },
  };
}
