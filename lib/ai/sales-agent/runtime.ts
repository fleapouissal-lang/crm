import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateSalesAgentChat,
  generateSalesAgentText,
  getSalesAgentModel,
  isSalesAgentConfigured,
  isSalesOutboundPaused,
  salesAgentTestLeadIds,
  salesAgentTestPhones,
} from "./client";
import {
  buildAgentContext,
  countMessagesLastHours,
  getOrCreateSettings,
  logAiAction,
} from "./context";
import { AGENT_DECISION_SCHEMA, buildLeadBrief, buildSystemPrompt } from "./prompts";
import {
  clarifyQuestion,
  detectProspectLanguage,
  briefOrMeetingPrompt,
  vocalClarifyQuestion,
  casablancaDayStart,
  casablancaWallTime,
  isWithinSendWindow,
  randomIntInclusive,
  isLocationAsk,
  locationAnswer,
  normalizeDarijaLatin,
} from "./language";
import { refreshLeadMemory } from "./memory";
import { findSimilarExamples, retrieveOlderMessages } from "./examples";
import { researchLeadIfNeeded } from "./research";
import { computeCommercialDelaySec, relanceAngle, silenceBucketHours } from "./timing";
import {
  insertProposedMeetings,
  nextFreeSlots,
  portfolioMessage,
} from "./tools";
import { upsertQualification, type QualificationPatch } from "@/lib/ai/qualification/upsert";
import {
  detectHandoffIntent,
  detectOptOutIntent,
  shouldHandoffForQualification,
} from "@/lib/ai/handoff/rules";
import { dispatchOutreachMessage } from "@/lib/outreach/dispatch";
import type { SalesStatus } from "@/types/database";

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] || text).trim();
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function ensureConversation(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  salesProject: string
): Promise<{ id: string; mode: string; clarify_count: number }> {
  const { data: existing } = await supabase
    .from("ai_conversations")
    .select("id, mode, clarify_count")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (existing) return existing as { id: string; mode: string; clarify_count: number };

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      organization_id: organizationId,
      lead_id: leadId,
      sales_project: salesProject,
      mode: "ai",
    })
    .select("id, mode, clarify_count")
    .single();
  if (error || !data) throw new Error(error?.message || "Unable to create conversation");
  return data as { id: string; mode: string; clarify_count: number };
}

async function appendMessage(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    conversationId: string;
    leadId: string;
    role: "prospect" | "assistant" | "human" | "system";
    body: string;
    providerMessageId?: string | null;
    outreachMessageId?: string | null;
    outreachReplyId?: string | null;
    model?: string | null;
    latencyMs?: number | null;
  }
) {
  await supabase.from("conversation_messages").insert({
    organization_id: input.organizationId,
    conversation_id: input.conversationId,
    lead_id: input.leadId,
    role: input.role,
    body: input.body,
    provider_message_id: input.providerMessageId ?? null,
    outreach_message_id: input.outreachMessageId ?? null,
    outreach_reply_id: input.outreachReplyId ?? null,
    model: input.model ?? null,
    latency_ms: input.latencyMs ?? null,
  });
  await supabase
    .from("ai_conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", input.conversationId);
}

async function withinRateLimits(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  maxLeadDay: number,
  maxOrgHour: number
): Promise<boolean> {
  const [leadDay, orgHour] = await Promise.all([
    countMessagesLastHours(supabase, organizationId, 24, leadId),
    countMessagesLastHours(supabase, organizationId, 1),
  ]);
  return leadDay < maxLeadDay && orgHour < maxOrgHour;
}

async function isTestLeadAllowed(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string
): Promise<boolean> {
  if (salesAgentTestLeadIds().has(leadId)) return true;
  const { data: lead } = await supabase
    .from("leads")
    .select("id, phone, phone_normalized, source, memory_facts")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return false;
  const facts = (lead.memory_facts || {}) as Record<string, string>;
  if (String(facts.test_lead || "").toLowerCase() === "true") return true;
  if (lead.source === "manual_test") return true;
  const digits = String(lead.phone_normalized || lead.phone || "").replace(/\D/g, "");
  const allowed = salesAgentTestPhones();
  for (const p of allowed) {
    if (digits === p || digits.slice(-9) === p.slice(-9)) return true;
  }
  return false;
}

async function enqueueAndSendWhatsApp(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  body: string,
  createdBy: string | null,
  options?: { delaySec?: number; conversationId?: string | null; salesProject?: string }
): Promise<
  | { messageId: string; providerMessageId: string | null; scheduled: false }
  | { messageId: string; providerMessageId: null; scheduled: true; scheduledFor: string }
  | { error: string }
> {
  if (isSalesOutboundPaused()) {
    const allowed = await isTestLeadAllowed(supabase, organizationId, leadId);
    if (!allowed) {
      await logAiAction(supabase, {
        organization_id: organizationId,
        lead_id: leadId,
        sales_project: options?.salesProject || "Fusion Leap",
        action: "outbound_paused",
        success: true,
        summary: "Outreach paused — non-test lead blocked",
      });
      return { error: "Outreach paused (test mode): non-test lead blocked" };
    }
  }

  const delaySec = Math.max(0, options?.delaySec ?? 0);
  const scheduledFor =
    delaySec > 0 ? new Date(Date.now() + delaySec * 1000).toISOString() : null;
  const idempotencyKey = `ai-${leadId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data: message, error } = await supabase
    .from("outreach_messages")
    .insert({
      organization_id: organizationId,
      lead_id: leadId,
      channel: "whatsapp",
      status: "queued",
      body,
      message_parts: [body],
      scheduled_for: scheduledFor,
      created_by: createdBy,
      approved_by: createdBy,
      approved_at: new Date().toISOString(),
      idempotency_key: idempotencyKey,
      provider: "easytouch",
    })
    .select("id")
    .single();
  if (error || !message) return { error: error?.message || "Unable to queue message" };

  if (scheduledFor) {
    await logAiAction(supabase, {
      organization_id: organizationId,
      lead_id: leadId,
      sales_project: options?.salesProject || "Fusion Leap",
      action: "reply_scheduled",
      success: true,
      summary: `Scheduled in ${delaySec}s`,
      metadata: {
        message_id: message.id,
        scheduled_for: scheduledFor,
        conversation_id: options?.conversationId ?? null,
        delay_sec: delaySec,
      },
    });
    return {
      messageId: message.id,
      providerMessageId: null,
      scheduled: true,
      scheduledFor,
    };
  }

  const result = await dispatchOutreachMessage(supabase, organizationId, message.id);
  if (!result.success) return { error: result.error };
  return {
    messageId: message.id,
    providerMessageId: result.providerMessageId,
    scheduled: false,
  };
}

/** Dispatch AI WhatsApp messages whose scheduled_for is due. */
export async function flushDueAiWhatsApp(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 20
): Promise<{ sent: number; errors: string[] }> {
  const now = new Date().toISOString();
  const { data: due } = await supabase
    .from("outreach_messages")
    .select("id, lead_id, body, scheduled_for")
    .eq("organization_id", organizationId)
    .eq("channel", "whatsapp")
    .eq("status", "queued")
    .eq("provider", "easytouch")
    .not("scheduled_for", "is", null)
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  let sent = 0;
  const errors: string[] = [];
  for (const row of due || []) {
    if (isSalesOutboundPaused()) {
      const allowed = await isTestLeadAllowed(supabase, organizationId, row.lead_id);
      if (!allowed) {
        await supabase
          .from("outreach_messages")
          .update({
            status: "failed",
            error_message: "cancelled_outreach_paused",
            scheduled_for: null,
          })
          .eq("id", row.id);
        continue;
      }
    }
    const result = await dispatchOutreachMessage(supabase, organizationId, row.id);
    if (!result.success) {
      errors.push(`${row.id}: ${result.error}`);
      continue;
    }
    sent += 1;

    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("lead_id", row.lead_id)
      .maybeSingle();
    if (conversation?.id) {
      await appendMessage(supabase, {
        organizationId,
        conversationId: conversation.id,
        leadId: row.lead_id,
        role: "assistant",
        body: row.body,
        outreachMessageId: row.id,
        providerMessageId: result.providerMessageId,
        model: getSalesAgentModel(),
      });
    }
  }
  return { sent, errors };
}

export async function generateFirstTouchMessage(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string
): Promise<{ body: string } | { error: string }> {
  if (!isSalesAgentConfigured()) return { error: "GEMINI_API_KEY is not configured" };
  const preview = await buildAgentContext(supabase, organizationId, leadId);
  await researchLeadIfNeeded(supabase, organizationId, preview.lead);
  const ctx = await buildAgentContext(supabase, organizationId, leadId);
  if (!ctx.settings.enabled || !ctx.settings.auto_first_touch) {
    return { error: "Auto first-touch is disabled" };
  }
  if (ctx.lead.contact_permission === "opted_out") return { error: "Lead opted out" };
  if (!ctx.lead.phone) return { error: "Lead has no phone" };

  const model = getSalesAgentModel();
  const started = Date.now();
  const seed = randomIntInclusive(1, 10_000);
  try {
    const project = ctx.lead.sales_project || "Fusion Leap";
    const offerLine =
      project === "Evana"
        ? "Accroche Fusion Leap : te présenter comme Fusion Leap (digitale, Marrakech), expliquer qu’Evana est un de vos projets immo/hôtel, et poser UNE question sur leur besoin (visibilité, réservations, site…)."
        : project === "Autolog"
          ? "Accroche Fusion Leap : te présenter comme Fusion Leap (digitale, Marrakech), expliquer qu’Autolog est un de vos projets flotte/location, et poser UNE question."
          : "Accroche Fusion Leap : te présenter (digitale / IA, Marrakech), montrer que vous couvrez le digital et l’IA, et poser UNE question pour comprendre.";
    const body = await generateSalesAgentText({
      system: buildSystemPrompt(ctx),
      maxTokens: 2048,
      user: [
        "Rédige UNIQUEMENT le premier message WhatsApp personnalisé (pas de JSON).",
        "Tu te présentes TOUJOURS comme Fusion Leap (jamais Evana ou Autolog comme marque qui parle).",
        "Base : Marrakech, Maroc. Activité : digital + IA.",
        offerLine,
        "Ne liste pas tous les services. Reste focus sur le besoin du prospect.",
        "Utilise le brief prospect. Pas de template générique.",
        "Le message DOIT faire 2 à 4 phrases : salutation + pourquoi tu contactes + UNE question concrète.",
        "Varie l'accroche (seed=" + seed + ").",
        "Si Maroc et langue inconnue : français pro OU darija légère — une seule langue, cohérente.",
        ctx.lead.research_notes
          ? "Utilise la recherche (secteur, ville, Instagram, ICE, extraits) pour personnaliser — sans reciter le site ni inventer un fait absent."
          : "Pas de recherche : reste générique-métier, pose une question sur leur activité.",
        buildLeadBrief(ctx),
      ].join("\n\n"),
    });
    if (!body) return { error: "Empty first-touch generation" };
    await logAiAction(supabase, {
      organization_id: organizationId,
      lead_id: leadId,
      sales_project: ctx.lead.sales_project,
      action: "generate_first_touch",
      model,
      success: true,
      summary: body.slice(0, 240),
      metadata: { latency_ms: Date.now() - started },
    });
    return { body };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    await logAiAction(supabase, {
      organization_id: organizationId,
      lead_id: leadId,
      sales_project: ctx.lead.sales_project,
      action: "generate_first_touch",
      model,
      success: false,
      error_message: message,
    });
    return { error: message };
  }
}

export async function sendFirstTouchAuto(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  actorId: string | null = null,
  options?: { delaySec?: number }
): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  if (isSalesOutboundPaused()) {
    const allowed = await isTestLeadAllowed(supabase, organizationId, leadId);
    if (!allowed) {
      return { success: false, error: "Outreach paused (test mode): first-touch blocked" };
    }
  }
  const ctx = await buildAgentContext(supabase, organizationId, leadId);
  if (!ctx.settings.enabled || !ctx.settings.auto_first_touch) {
    return { success: false, error: "Auto first-touch disabled" };
  }
  if (ctx.settings.require_human_approval) {
    return { success: false, error: "Human approval required for first touch" };
  }
  if (
    options?.delaySec == null &&
    !isWithinSendWindow(
      ctx.settings.send_window_start_hour ?? 9,
      ctx.settings.send_window_end_hour ?? 21
    )
  ) {
    return { success: false, error: "Outside send window (Africa/Casablanca)" };
  }
  const allowed = await withinRateLimits(
    supabase,
    organizationId,
    leadId,
    ctx.settings.max_msgs_per_lead_day,
    ctx.settings.max_msgs_per_org_hour
  );
  if (!allowed) return { success: false, error: "Rate limit reached" };

  if (ctx.lead.contact_permission === "unknown" && !ctx.settings.require_opt_in_mode) {
    await supabase
      .from("leads")
      .update({ contact_permission: "legitimate_interest" })
      .eq("id", leadId)
      .eq("organization_id", organizationId);
  }

  const generated = await generateFirstTouchMessage(supabase, organizationId, leadId);
  if ("error" in generated) return { success: false, error: generated.error };

  const conversation = await ensureConversation(
    supabase,
    organizationId,
    leadId,
    ctx.lead.sales_project
  );
  const staggerSec =
    options?.delaySec ??
    randomIntInclusive(
      ctx.settings.first_touch_stagger_min_sec ?? 0,
      ctx.settings.first_touch_stagger_max_sec ?? 0
    );
  const sent = await enqueueAndSendWhatsApp(
    supabase,
    organizationId,
    leadId,
    generated.body,
    actorId,
    {
      delaySec: staggerSec,
      conversationId: conversation.id,
      salesProject: ctx.lead.sales_project,
    }
  );
  if ("error" in sent) return { success: false, error: sent.error };

  if (!sent.scheduled) {
    await appendMessage(supabase, {
      organizationId,
      conversationId: conversation.id,
      leadId,
      role: "assistant",
      body: generated.body,
      outreachMessageId: sent.messageId,
      providerMessageId: sent.providerMessageId,
      model: getSalesAgentModel(),
    });
  }

  await supabase
    .from("leads")
    .update({
      sales_status: "message_sent" as SalesStatus,
      stage: "contacted",
      last_contact_method: "phone",
      last_contacted_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("organization_id", organizationId);

  await logAiAction(supabase, {
    organization_id: organizationId,
    lead_id: leadId,
    sales_project: ctx.lead.sales_project,
    action: "send_first_touch",
    success: true,
    summary: generated.body.slice(0, 240),
    metadata: {
      message_id: sent.messageId,
      scheduled: sent.scheduled,
      stagger_sec: staggerSec,
      auto_daily: options?.delaySec != null,
    },
  });

  return { success: true, messageId: sent.messageId };
}

/**
 * Queue up to `daily_first_touch_limit` (default 30) first touches per Casablanca day,
 * spread across the send window so they leave at different times.
 */
export async function processDailyAutoFirstTouch(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ queued: number; skipped: number; errors: string[]; limit: number; alreadyToday: number }> {
  if (isSalesOutboundPaused()) {
    return {
      queued: 0,
      skipped: 0,
      errors: ["Outreach paused (test mode): auto first-touch disabled"],
      limit: 0,
      alreadyToday: 0,
    };
  }
  const errors: string[] = [];
  const { data: settingsRows } = await supabase
    .from("sales_agent_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("enabled", true)
    .eq("auto_first_touch", true)
    .eq("require_human_approval", false);

  if (!settingsRows?.length) {
    return { queued: 0, skipped: 0, errors: ["No project with auto first-touch enabled"], limit: 0, alreadyToday: 0 };
  }

  const limit = Math.max(
    0,
    ...settingsRows.map((s) => Number(s.daily_first_touch_limit ?? 30))
  );
  const startHour = Math.min(...settingsRows.map((s) => Number(s.send_window_start_hour ?? 9)));
  const endHour = Math.max(...settingsRows.map((s) => Number(s.send_window_end_hour ?? 21)));

  if (!isWithinSendWindow(startHour, endHour)) {
    return { queued: 0, skipped: 0, errors: [], limit, alreadyToday: 0 };
  }

  const dayStart = casablancaDayStart().toISOString();
  const { count: alreadyToday } = await supabase
    .from("ai_action_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("action", "send_first_touch")
    .eq("success", true)
    .gte("created_at", dayStart);

  const done = alreadyToday ?? 0;
  const remaining = Math.max(0, limit - done);
  if (remaining <= 0) {
    return { queued: 0, skipped: 0, errors: [], limit, alreadyToday: done };
  }

  const projects = settingsRows.map((s) => s.sales_project);
  const { data: candidates } = await supabase
    .from("leads")
    .select("id, phone, sales_project, sales_status, stage, contact_permission")
    .eq("organization_id", organizationId)
    .in("sales_project", projects)
    .not("phone", "is", null)
    .neq("contact_permission", "opted_out")
    .or("sales_status.eq.new,sales_status.is.null,stage.eq.new")
    .order("created_at", { ascending: true })
    .limit(remaining * 4);

  const eligible: string[] = [];
  for (const lead of candidates || []) {
    if (!lead.phone?.trim()) continue;
    const { data: prior } = await supabase
      .from("outreach_messages")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", lead.id)
      .eq("channel", "whatsapp")
      .in("status", ["draft", "approved", "queued", "sending", "sent", "delivered", "replied"])
      .limit(1)
      .maybeSingle();
    if (prior?.id) continue;
    eligible.push(lead.id);
    if (eligible.length >= remaining) break;
  }

  if (!eligible.length) {
    return { queued: 0, skipped: 0, errors: [], limit, alreadyToday: done };
  }

  const now = Date.now();
  let windowEnd = casablancaWallTime(endHour, 0, new Date()).getTime();
  // If end is "tomorrow" because hour passed, use today end: wall time for endHour today
  const todayYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const todayEnd = new Date(
    `${todayYmd}T${String(endHour).padStart(2, "0")}:00:00+01:00`
  ).getTime();
  if (todayEnd > now) windowEnd = todayEnd;

  const spanSec = Math.max(30 * 60, Math.floor((windowEnd - now) / 1000));
  const n = eligible.length;
  let queued = 0;
  let skipped = 0;

  for (let i = 0; i < n; i++) {
    const slot = Math.floor((spanSec * i) / n);
    const jitter = randomIntInclusive(30, 180);
    const delaySec = Math.min(spanSec - 60, slot + jitter);
    const result = await sendFirstTouchAuto(supabase, organizationId, eligible[i], null, {
      delaySec: Math.max(45, delaySec),
    });
    if (result.success) queued += 1;
    else {
      skipped += 1;
      errors.push(`${eligible[i]}: ${result.error}`);
    }
  }

  return { queued, skipped, errors: errors.slice(0, 15), limit, alreadyToday: done };
}

type AgentDecision = {
  action:
    | "reply"
    | "handoff"
    | "clarify"
    | "unclear"
    | "stop_opt_out"
    | "propose_meeting"
    | "request_brief"
    | "send_proposal"
    | "send_portfolio"
    | "noop";
  message?: string;
  handoff_reason?: string;
  sales_status?: SalesStatus;
  qualification?: QualificationPatch;
  proposal?: { amount?: number; service?: string };
};

function looksLikePriceAsk(text: string): boolean {
  return /\b(prix|tarif|devis|facture|combien|budget|chhal|ثمن|سعر|غالي|facture|quote|price|cost)\b/i.test(
    text
  );
}

async function decideInboundReply(
  supabase: SupabaseClient,
  organizationId: string,
  ctx: Awaited<ReturnType<typeof buildAgentContext>>,
  inboundText: string,
  freeSlots: string[] = []
): Promise<AgentDecision> {
  if (detectOptOutIntent(inboundText)) {
    return { action: "stop_opt_out", handoff_reason: "Prospect opted out" };
  }
  if (detectHandoffIntent(inboundText)) {
    return { action: "handoff", handoff_reason: "Prospect requested a human" };
  }
  if (!isSalesAgentConfigured()) {
    return { action: "handoff", handoff_reason: "AI not configured" };
  }

  const history = ctx.history.map((m) => ({
    role: (m.role === "assistant" || m.role === "human" ? "assistant" : "user") as
      | "assistant"
      | "user",
    content: m.body,
  }));
  const detected = detectProspectLanguage(inboundText);
  ctx.examples = await findSimilarExamples(supabase, organizationId, inboundText).catch(
    () => ctx.examples
  );
  if (ctx.conversationId) {
    ctx.olderRecalls = await retrieveOlderMessages(
      supabase,
      ctx.conversationId,
      [inboundText, ctx.lead.ai_summary, Object.values(ctx.lead.memory_facts || {}).join(" ")]
        .filter(Boolean)
        .join(" ")
    ).catch(() => ctx.olderRecalls);
  }

  const text = await generateSalesAgentChat({
    system: `${buildSystemPrompt(ctx, { prospectText: inboundText, forceLanguage: detected })}\n\nRéponds UNIQUEMENT en JSON valide:\n${AGENT_DECISION_SCHEMA}`,
    maxTokens: 1024,
    messages: [
      ...history.slice(-20),
      {
        role: "user",
        content: [
          "Nouveau message prospect (peut être plusieurs lignes d’affilée — traite comme UN tour):",
          inboundText,
          "",
          `Langue détectée à respecter: ${detected}`,
          "",
          "RÈGLES RÉPONSE:",
          "- UN seul message WhatsApp court (2–4 phrases max). Jamais 2 réponses pour le même tour.",
          "- Si le prospect écrit en darija latin (fin/foin kaynin, ina ville, wach, chno…) → COMPRENDS et réponds en darija. Ne dis PAS que tu n’as pas compris.",
          "- « fin/foin kaynin » / « ina ville » = où êtes-vous / quelle ville → réponds clairement (remote Maroc / Casa / Marrakech selon le projet), puis UNE question utile.",
          "- N’invente pas d’incompréhension pour forcer un clarify.",
          "",
          `Clarifies déjà posées: ${ctx.clarifyCount}/2. Clarify UNIQUEMENT si vraiment ambigu après lecture darija.`,
          freeSlots.length
            ? `Créneaux libres à proposer (ne pas inventer): ${freeSlots.join(" · ")}`
            : "",
          "",
          "Rappel prix: JAMAIS devis/facture/montant. Si demande de prix → request_brief (cahier des charges) OU propose_meeting.",
          "",
          "Brief:",
          buildLeadBrief(ctx),
        ].join("\n"),
      },
    ],
  });

  const parsed = extractJson(text);
  if (!parsed || typeof parsed.action !== "string") {
    return {
      action: "reply",
      message: text.trim().slice(0, 500) || undefined,
    };
  }
  return parsed as unknown as AgentDecision;
}

async function cancelPendingAiReplies(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  exceptId?: string | null
) {
  let q = supabase
    .from("outreach_messages")
    .update({
      status: "failed",
      error_message: "superseded_by_newer_reply",
      scheduled_for: null,
    })
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .eq("channel", "whatsapp")
    .eq("status", "queued")
    .not("scheduled_for", "is", null);
  if (exceptId) q = q.neq("id", exceptId);
  await q;
}

async function coalesceRecentProspectText(
  supabase: SupabaseClient,
  conversationId: string,
  latest: string,
  windowSec = 25
): Promise<string> {
  const since = new Date(Date.now() - windowSec * 1000).toISOString();
  const { data } = await supabase
    .from("conversation_messages")
    .select("body, created_at")
    .eq("conversation_id", conversationId)
    .eq("role", "prospect")
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  const parts = (data || [])
    .map((m) => String(m.body || "").trim())
    .filter(Boolean);
  if (!parts.length) return latest.trim();
  // Dedupe while keeping order
  const uniq: string[] = [];
  for (const p of parts) {
    if (!uniq.includes(p)) uniq.push(p);
  }
  if (!uniq.includes(latest.trim()) && latest.trim()) uniq.push(latest.trim());
  return uniq.join("\n");
}

export async function handleInboundMessage(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  inboundText: string,
  meta?: { providerMessageId?: string | null; outreachReplyId?: string | null }
): Promise<{ handled: boolean; action: string; error?: string }> {
  const ctx = await buildAgentContext(supabase, organizationId, leadId);
  const conversation = await ensureConversation(
    supabase,
    organizationId,
    leadId,
    ctx.lead.sales_project
  );

  await appendMessage(supabase, {
    organizationId,
    conversationId: conversation.id,
    leadId,
    role: "prospect",
    body: inboundText,
    providerMessageId: meta?.providerMessageId,
    outreachReplyId: meta?.outreachReplyId,
  });

  await supabase
    .from("leads")
    .update({
      sales_status: "reply_received" as SalesStatus,
      last_contacted_at: new Date().toISOString(),
      last_contact_method: "phone",
    })
    .eq("id", leadId)
    .eq("organization_id", organizationId);

  if (!ctx.settings.enabled || !ctx.settings.auto_reply || conversation.mode !== "ai") {
    await logAiAction(supabase, {
      organization_id: organizationId,
      lead_id: leadId,
      sales_project: ctx.lead.sales_project,
      action: "inbound_skipped",
      success: true,
      summary: `mode=${conversation.mode} enabled=${ctx.settings.enabled}`,
    });
    return { handled: false, action: "skipped" };
  }

  // Only reply if we already messaged this lead on WhatsApp (never cold-reply all CRM clients)
  const { data: priorOutbound } = await supabase
    .from("outreach_messages")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .eq("channel", "whatsapp")
    .in("status", ["sent", "delivered", "replied", "queued", "sending"])
    .limit(1)
    .maybeSingle();
  if (!priorOutbound?.id) {
    await logAiAction(supabase, {
      organization_id: organizationId,
      lead_id: leadId,
      sales_project: ctx.lead.sales_project,
      action: "inbound_skipped_no_outbound",
      success: true,
      summary: "No prior WhatsApp outreach — AI will not reply",
    });
    return { handled: false, action: "skipped_no_outbound" };
  }

  // Drop any older scheduled AI replies so we never flood 2–4 messages
  await cancelPendingAiReplies(supabase, organizationId, leadId);

  const combinedInbound = await coalesceRecentProspectText(
    supabase,
    conversation.id,
    inboundText,
    25
  );
  const normalizedInbound = normalizeDarijaLatin(combinedInbound);

  const researched = await researchLeadIfNeeded(supabase, organizationId, ctx.lead).catch(
    () => ctx.lead.research_notes
  );
  if (researched) ctx.lead.research_notes = researched;

  const allowed = await withinRateLimits(
    supabase,
    organizationId,
    leadId,
    ctx.settings.max_msgs_per_lead_day,
    ctx.settings.max_msgs_per_org_hour
  );
  if (!allowed) {
    await transferToHuman(
      supabase,
      organizationId,
      conversation.id,
      leadId,
      ctx.settings.handoff_assignee_id,
      "Rate limit"
    );
    return { handled: true, action: "handoff" };
  }

  const freeSlots = await nextFreeSlots(supabase, organizationId, 3);
  let decision: AgentDecision;
  try {
    if (/vocal non transcrit/i.test(normalizedInbound) && normalizedInbound.length < 120) {
      const vocalAttempts = conversation.clarify_count || 0;
      decision =
        vocalAttempts < 2
          ? {
              action: "clarify",
              message: vocalClarifyQuestion(
                detectProspectLanguage(normalizedInbound),
                vocalAttempts
              ),
              handoff_reason: "Vocal non transcrit",
            }
          : { action: "unclear", handoff_reason: "Vocal WhatsApp non transcrit" };
    } else if (isLocationAsk(normalizedInbound)) {
      const lang = detectProspectLanguage(normalizedInbound);
      decision = {
        action: "reply",
        message: locationAnswer(lang, ctx.lead.sales_project, ctx.lead.city),
        sales_status: "discussion",
      };
    } else {
      decision = await decideInboundReply(
        supabase,
        organizationId,
        ctx,
        normalizedInbound,
        freeSlots.map((s) => s.label)
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Decision failed";
    await transferToHuman(
      supabase,
      organizationId,
      conversation.id,
      leadId,
      ctx.settings.handoff_assignee_id,
      message
    );
    return { handled: true, action: "handoff", error: message };
  }

  if (decision.qualification) {
    await upsertQualification(supabase, organizationId, leadId, decision.qualification, "ai");
  }

  await refreshLeadMemory(supabase, organizationId, leadId, {
    inbound: normalizedInbound,
    action: decision.action,
    qualification: decision.qualification || ctx.qualification,
    previousSummary: ctx.lead.ai_summary,
    previousFacts: ctx.lead.memory_facts || {},
  });

  const clarifyUsed = conversation.clarify_count || 0;
  if ((decision.action === "unclear" || decision.action === "noop") && clarifyUsed < 2) {
    const lang = detectProspectLanguage(normalizedInbound);
    decision = {
      action: "clarify",
      message: decision.message?.trim() || clarifyQuestion(lang, clarifyUsed),
      handoff_reason: decision.handoff_reason,
    };
  }

  // AI does not understand after a clarify → no WhatsApp reply, flag urgent
  if (decision.action === "unclear" || decision.action === "noop") {
    const reason =
      decision.handoff_reason ||
      (decision.action === "noop"
        ? "AI noop — besoin de relecture humaine"
        : "Message non compris par l'IA");
    await transferToHuman(
      supabase,
      organizationId,
      conversation.id,
      leadId,
      ctx.settings.handoff_assignee_id,
      reason,
      { urgent: true, updateLeadStage: false }
    );
    await appendMessage(supabase, {
      organizationId,
      conversationId: conversation.id,
      leadId,
      role: "system",
      body: `⚠️ Urgent — réponse manuelle requise: ${reason}`,
    });
    await logAiAction(supabase, {
      organization_id: organizationId,
      lead_id: leadId,
      sales_project: ctx.lead.sales_project,
      action: "unclear_escalated",
      success: true,
      summary: reason.slice(0, 240),
      metadata: { inbound: normalizedInbound.slice(0, 200) },
    });
    return { handled: true, action: "unclear" };
  }

  if (
    decision.action === "handoff" ||
    shouldHandoffForQualification(
      decision.qualification?.score ?? ctx.qualification?.score,
      decision.qualification?.interest_level ?? ctx.qualification?.interest_level
    )
  ) {
    await transferToHuman(
      supabase,
      organizationId,
      conversation.id,
      leadId,
      ctx.settings.handoff_assignee_id,
      decision.handoff_reason || "Qualified / handoff",
      { urgent: false, updateLeadStage: true }
    );
    if (decision.sales_status) {
      await supabase
        .from("leads")
        .update({ sales_status: decision.sales_status })
        .eq("id", leadId);
    } else {
      await supabase
        .from("leads")
        .update({ sales_status: "qualified" as SalesStatus, stage: "qualified" })
        .eq("id", leadId);
    }
    return { handled: true, action: "handoff" };
  }

  if (decision.action === "stop_opt_out") {
    await supabase
      .from("leads")
      .update({
        contact_permission: "opted_out",
        sales_status: "lost" as SalesStatus,
        stage: "lost",
      })
      .eq("id", leadId);
    await supabase
      .from("ai_conversations")
      .update({ mode: "paused", handoff_reason: "opted_out" })
      .eq("id", conversation.id);
    await supabase
      .from("outreach_relances")
      .update({ status: "cancelled", response_received_at: new Date().toISOString() })
      .eq("lead_id", leadId)
      .eq("status", "planned");
    return { handled: true, action: "stop_opt_out" };
  }

  if (decision.action === "send_portfolio") {
    const extra = portfolioMessage(ctx.lead.sales_project);
    decision.message = [decision.message?.trim(), extra].filter(Boolean).join("\n");
    decision.action = "reply";
  }

  // Agent never auto-sends devis/facture — redirect to brief or RDV
  if (decision.action === "send_proposal") {
    decision.action = freeSlots.length ? "propose_meeting" : "request_brief";
    decision.message =
      decision.message?.trim() ||
      briefOrMeetingPrompt(detectProspectLanguage(inboundText));
    decision.proposal = undefined;
  }

  if (
    looksLikePriceAsk(inboundText) &&
    decision.action === "reply" &&
    /\b(\d[\d\s.,]*\s*(mad|dh|€|eur|dollar)|\d{3,})\b/i.test(decision.message || "")
  ) {
    decision.message = briefOrMeetingPrompt(detectProspectLanguage(inboundText));
  }

  if (decision.action === "request_brief") {
    decision.message =
      decision.message?.trim() ||
      briefOrMeetingPrompt(detectProspectLanguage(inboundText));
    decision.action = "reply";
  }

  if (decision.action === "propose_meeting") {
    await insertProposedMeetings(supabase, organizationId, leadId, freeSlots);
    if (!decision.message?.trim() && freeSlots.length) {
      decision.message = `On peut se parler ${freeSlots
        .slice(0, 2)
        .map((s) => s.label)
        .join(" ou ")} — 20 min en visio. Lequel vous va ?`;
    }
    await supabase
      .from("leads")
      .update({ sales_status: "meeting_proposed" as SalesStatus, stage: "negotiation" })
      .eq("id", leadId);
  }

  if (decision.action === "clarify" && decision.message?.trim()) {
    await supabase
      .from("ai_conversations")
      .update({ clarify_count: clarifyUsed + 1 })
      .eq("id", conversation.id);
    decision.action = "reply";
  } else if (decision.action === "reply" || decision.action === "propose_meeting") {
    await supabase.from("ai_conversations").update({ clarify_count: 0 }).eq("id", conversation.id);
  }

  if (
    (decision.action === "reply" || decision.action === "propose_meeting") &&
    decision.message?.trim()
  ) {
    // One reply only — drop any other queued AI messages for this lead
    await cancelPendingAiReplies(supabase, organizationId, leadId);

    const lastAssistant = [...ctx.history]
      .reverse()
      .find((m) => m.role === "assistant" || m.role === "human");
    const timing = computeCommercialDelaySec({
      minSec: Math.min(25, ctx.settings.reply_delay_min_sec ?? 45),
      maxSec: Math.min(90, ctx.settings.reply_delay_max_sec ?? 180),
      startHour: ctx.settings.send_window_start_hour ?? 9,
      endHour: ctx.settings.send_window_end_hour ?? 21,
      lastAssistantAt: lastAssistant?.created_at,
    });
    // Location / clear intents: reply faster
    const delaySec = isLocationAsk(normalizedInbound)
      ? randomIntInclusive(8, 25)
      : timing.delaySec;
    const sent = await enqueueAndSendWhatsApp(
      supabase,
      organizationId,
      leadId,
      decision.message.trim(),
      ctx.settings.handoff_assignee_id,
      {
        delaySec,
        conversationId: conversation.id,
        salesProject: ctx.lead.sales_project,
      }
    );
    if ("error" in sent) {
      await transferToHuman(
        supabase,
        organizationId,
        conversation.id,
        leadId,
        ctx.settings.handoff_assignee_id,
        sent.error
      );
      return { handled: true, action: "handoff", error: sent.error };
    }
    if (!sent.scheduled) {
      await appendMessage(supabase, {
        organizationId,
        conversationId: conversation.id,
        leadId,
        role: "assistant",
        body: decision.message.trim(),
        outreachMessageId: sent.messageId,
        providerMessageId: sent.providerMessageId,
        model: getSalesAgentModel(),
      });
    }
    const nextStatus =
      decision.sales_status ||
      (decision.action === "propose_meeting" ? "meeting_proposed" : "discussion");
    await supabase
      .from("leads")
      .update({ sales_status: nextStatus as SalesStatus })
      .eq("id", leadId)
      .eq("organization_id", organizationId);

    await logAiAction(supabase, {
      organization_id: organizationId,
      lead_id: leadId,
      sales_project: ctx.lead.sales_project,
      action: sent.scheduled ? "reply_scheduled" : decision.action,
      success: true,
      summary: decision.message.slice(0, 240),
      metadata: {
        message_id: sent.messageId,
        delay_sec: delaySec,
        language: detectProspectLanguage(inboundText),
        scheduled: sent.scheduled,
        fast_chat: timing.fastChat,
        deferred_to_window: timing.deferredToWindow,
      },
    });
    return { handled: true, action: sent.scheduled ? "reply_scheduled" : decision.action };
  }

  return { handled: true, action: decision.action || "noop" };
}

async function transferToHuman(
  supabase: SupabaseClient,
  organizationId: string,
  conversationId: string,
  leadId: string,
  assigneeId: string | null,
  reason: string,
  options?: { urgent?: boolean; updateLeadStage?: boolean }
) {
  const urgent = Boolean(options?.urgent);
  const updateLeadStage = options?.updateLeadStage !== false;

  await supabase
    .from("ai_conversations")
    .update({
      mode: "human",
      handoff_reason: reason.slice(0, 500),
      assigned_to: assigneeId,
      urgent,
    })
    .eq("id", conversationId);

  if (updateLeadStage) {
    const leadUpdate: Record<string, string> = {
      sales_status: "qualified",
      stage: "qualified",
    };
    if (assigneeId) leadUpdate.assigned_to = assigneeId;
    await supabase.from("leads").update(leadUpdate).eq("id", leadId).eq("organization_id", organizationId);
  } else if (assigneeId) {
    await supabase
      .from("leads")
      .update({ assigned_to: assigneeId })
      .eq("id", leadId)
      .eq("organization_id", organizationId);
  }

  await supabase
    .from("outreach_relances")
    .update({ status: "cancelled", response_received_at: new Date().toISOString() })
    .eq("lead_id", leadId)
    .eq("status", "planned");

  await supabase.from("activities").insert({
    organization_id: organizationId,
    type: "lead_stage_changed",
    entity_type: "lead",
    entity_id: leadId,
    user_id: assigneeId,
    message: urgent
      ? `URGENT — IA n'a pas compris: ${reason.slice(0, 200)}`
      : `AI handoff: ${reason.slice(0, 240)}`,
  });

  await logAiAction(supabase, {
    organization_id: organizationId,
    lead_id: leadId,
    action: urgent ? "handoff_urgent" : "handoff",
    success: true,
    summary: reason.slice(0, 240),
    metadata: { urgent },
  });
}

export async function generateRelanceBody(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string,
  sequence: number
): Promise<string> {
  const fallback =
    sequence === 1
      ? "Bonjour, je voulais simplement vérifier si le sujet vous intéresse toujours. Je peux vous envoyer un exemple concret."
      : sequence === 2
        ? "Petit rappel amical — souhaitez-vous un échange rapide cette semaine ?"
        : "Dernier message de ma part : dites-moi si je dois archiver le dossier.";

  if (!isSalesAgentConfigured()) return fallback;
  try {
    const ctx = await buildAgentContext(supabase, organizationId, leadId);
    const lastProspect = [...ctx.history].reverse().find((m) => m.role === "prospect")?.body;
    const silentH = silenceBucketHours(ctx.lead.last_contacted_at);
    const body = await generateSalesAgentText({
      system: buildSystemPrompt(ctx, { prospectText: lastProspect }),
      maxTokens: 250,
      user: [
        `Rédige UNIQUEMENT la relance WhatsApp n°${sequence} (différente du premier message).`,
        "Court, naturel, non spammy. Même langue que le prospect.",
        relanceAngle(silentH, sequence),
        silentH != null ? `Silence depuis ~${silentH}h.` : "",
        buildLeadBrief(ctx),
        ctx.history.length
          ? `Historique récent:\n${ctx.history
              .slice(-6)
              .map((m) => `${m.role}: ${m.body}`)
              .join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    return body || fallback;
  } catch {
    return fallback;
  }
}

export { getOrCreateSettings };
