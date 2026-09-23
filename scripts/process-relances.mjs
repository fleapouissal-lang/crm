import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const bridgeUrl = (process.env.WA_BRIDGE_URL || "").replace(/\/$/, "");
const bridgeSecret = process.env.WA_BRIDGE_SECRET;
const instanceFor = (project) =>
  project === "Autolog"
    ? process.env.WA_BRIDGE_INSTANCE_ID_AUTOLOG || "autolog_crm"
    : process.env.WA_BRIDGE_INSTANCE_ID_FUSION_LEAP ||
      process.env.WA_BRIDGE_INSTANCE_ID ||
      "fusionleap_crm";

if (!bridgeUrl || !bridgeSecret) throw new Error("WhatsApp bridge is not configured");

async function hasReply(organizationId, leadId) {
  const { data } = await supabase
    .from("outreach_replies")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .limit(1);
  return Boolean(data?.length);
}

async function isHumanMode(leadId) {
  const { data } = await supabase
    .from("ai_conversations")
    .select("mode")
    .eq("lead_id", leadId)
    .maybeSingle();
  return data?.mode === "human" || data?.mode === "paused";
}

function silenceHours(lastContactedAt) {
  if (!lastContactedAt) return null;
  const ms = Date.now() - new Date(lastContactedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 3600_000);
}

function relanceAngle(hours, sequence) {
  if (hours == null) return "Relance courte, nouvel angle.";
  if (hours < 20) return "Silence court : rappel très léger, une question, zéro pression.";
  if (hours < 48) return "Silence 1-2 jours : check-in + exemple concret.";
  if (hours < 120) return "Silence plusieurs jours : changer d'angle, proposer RDV court.";
  return "Silence long : clôture douce, porte ouverte.";
}

function geminiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ""
  );
}

function geminiModel() {
  return (
    process.env.SALES_AGENT_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.5-flash"
  );
}

async function generateRelance(lead, sequence) {
  const apiKey = geminiKey();
  const fallback =
    sequence === 1
      ? "Bonjour, je voulais simplement vérifier si le sujet vous intéresse toujours. Je peux vous envoyer un exemple concret."
      : sequence === 2
        ? "Petit rappel amical — souhaitez-vous un échange rapide cette semaine ?"
        : "Dernier message de ma part : souhaitez-vous un échange rapide cette semaine ?";
  if (!apiKey) return fallback;
  const hours = silenceHours(lead.last_contacted_at);
  const friday =
    new Date().toLocaleString("en-GB", {
      timeZone: "Africa/Casablanca",
      weekday: "short",
    }) === "Fri";
  try {
    const model = geminiModel();
    const system =
      "Tu es un commercial WhatsApp Fusion Leap. Relance courte, naturelle, non spammy. Réponds uniquement avec le texte du message. Vendredi: ton plus léger.";
    const user = `Rédige la relance n°${sequence} pour ${lead.contact_name || lead.title} (${lead.sales_project}). Entreprise: ${lead.company || "n/a"}. Mémo: ${lead.ai_summary || "n/a"}. ${relanceAngle(hours, sequence)}${hours != null ? ` Silence ~${hours}h.` : ""}${friday ? " Vendredi: pas de pression." : ""}`;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: 250 },
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!response.ok) return fallback;
    const payload = await response.json();
    const text = (payload?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("\n")
      .trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function nextDelayHours(organizationId, salesProject, sequence) {
  const { data } = await supabase
    .from("sales_agent_settings")
    .select("relance_delays_hours")
    .eq("organization_id", organizationId)
    .eq("sales_project", salesProject || "Fusion Leap")
    .maybeSingle();
  const delays = Array.isArray(data?.relance_delays_hours) ? data.relance_delays_hours : [8, 16, 24];
  const base = Number(delays[Math.min(sequence, delays.length) - 1] || delays[delays.length - 1] || 8);
  return base + Math.random() * 2;
}

async function send(row, body) {
  const instance = instanceFor(row.lead.sales_project);
  const response = await fetch(`${bridgeUrl}/instance/${encodeURIComponent(instance)}/send`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: bridgeSecret },
    body: JSON.stringify({ number: row.lead.phone, text: body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Bridge returned ${response.status}`);
  return payload.messageId || null;
}

const now = new Date();
const { data: due, error } = await supabase
  .from("outreach_relances")
  .select("*, lead:leads(id,title,phone,company,contact_name,sales_project,stage,sales_status,contact_permission,last_contacted_at,ai_summary)")
  .eq("status", "planned")
  .lte("scheduled_for", now.toISOString())
  .limit(50);
if (error) throw error;

for (const row of due || []) {
  if (
    !row.lead?.phone ||
    row.lead.contact_permission === "opted_out" ||
    ["qualified", "won", "lost"].includes(row.lead.stage) ||
    ["won", "lost", "meeting_confirmed", "proposal_sent"].includes(row.lead.sales_status) ||
    (await hasReply(row.organization_id, row.lead_id)) ||
    (await isHumanMode(row.lead_id))
  ) {
    await supabase
      .from("outreach_relances")
      .update({ status: "cancelled", response_received_at: now.toISOString() })
      .eq("id", row.id);
    continue;
  }

  await supabase.from("outreach_relances").update({ status: "sending" }).eq("id", row.id).eq("status", "planned");
  try {
    const body = await generateRelance(row.lead, row.sequence);
    const providerMessageId = await send(row, body);
    const sentAt = new Date().toISOString();
    await supabase
      .from("outreach_relances")
      .update({
        status: "sent",
        body,
        sent_at: sentAt,
        provider_message_id: providerMessageId,
        lost_at: row.sequence === 3 ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
      })
      .eq("id", row.id);

    await supabase
      .from("leads")
      .update({ sales_status: "follow_up", last_contacted_at: sentAt, last_contact_method: "phone" })
      .eq("id", row.lead_id);

    if (row.sequence < 3) {
      const delayH = await nextDelayHours(row.organization_id, row.lead.sales_project, row.sequence + 1);
      const nextBody = await generateRelance(row.lead, row.sequence + 1);
      await supabase.from("outreach_relances").insert({
        organization_id: row.organization_id,
        lead_id: row.lead_id,
        sequence: row.sequence + 1,
        status: "planned",
        body: nextBody,
        scheduled_for: new Date(Date.now() + delayH * 60 * 60 * 1000).toISOString(),
      });
    }
  } catch (err) {
    await supabase
      .from("outreach_relances")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Relance failed",
      })
      .eq("id", row.id);
  }
}

const { data: lostRows } = await supabase
  .from("outreach_relances")
  .select("organization_id,lead_id,lead:leads(stage,sales_status)")
  .eq("sequence", 3)
  .eq("status", "sent")
  .lte("lost_at", now.toISOString());
for (const row of lostRows || []) {
  if (row.lead?.stage === "lost" || (await hasReply(row.organization_id, row.lead_id))) continue;
  await supabase
    .from("leads")
    .update({ stage: "lost", sales_status: "lost" })
    .eq("id", row.lead_id)
    .eq("organization_id", row.organization_id);
  await supabase
    .from("outreach_relances")
    .update({ status: "lost" })
    .eq("lead_id", row.lead_id)
    .eq("sequence", 3)
    .eq("status", "sent");
}

console.log(JSON.stringify({ processed: due?.length || 0, lost: lostRows?.length || 0 }));
