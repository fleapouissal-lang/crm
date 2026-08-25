import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bridgeUrl = (process.env.WA_BRIDGE_URL || "").replace(/\/$/, "");
const bridgeSecret = process.env.WA_BRIDGE_SECRET;
const instanceFor = (project) => project === "Autolog"
  ? process.env.WA_BRIDGE_INSTANCE_ID_AUTOLOG || "autolog_crm"
  : process.env.WA_BRIDGE_INSTANCE_ID_FUSION_LEAP || process.env.WA_BRIDGE_INSTANCE_ID || "fusionleap_crm";
const nextDelay = () => (6 + Math.random() * 6) * 60 * 60 * 1000;

if (!bridgeUrl || !bridgeSecret) throw new Error("WhatsApp bridge is not configured");

async function hasReply(organizationId, leadId) {
  const { data } = await supabase.from("outreach_replies").select("id").eq("organization_id", organizationId).eq("lead_id", leadId).limit(1);
  return Boolean(data?.length);
}

async function send(row) {
  const instance = instanceFor(row.lead.sales_project);
  const response = await fetch(`${bridgeUrl}/instance/${encodeURIComponent(instance)}/send`, {
    method: "POST", headers: { "content-type": "application/json", apikey: bridgeSecret },
    body: JSON.stringify({ number: row.lead.phone, text: row.body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Bridge returned ${response.status}`);
  return payload.messageId || null;
}

const now = new Date();
const { data: due, error } = await supabase.from("outreach_relances")
  .select("*, lead:leads(id,title,phone,sales_project,stage,contact_permission)")
  .eq("status", "planned").lte("scheduled_for", now.toISOString()).limit(50);
if (error) throw error;
for (const row of due || []) {
  if (!row.lead?.phone || ["opted_out", "unknown"].includes(row.lead.contact_permission) || ["qualified", "won", "lost"].includes(row.lead.stage) || await hasReply(row.organization_id, row.lead_id)) {
    await supabase.from("outreach_relances").update({ status: "cancelled", response_received_at: now.toISOString() }).eq("id", row.id);
    continue;
  }
  await supabase.from("outreach_relances").update({ status: "sending" }).eq("id", row.id).eq("status", "planned");
  try {
    const providerMessageId = await send(row);
    const sentAt = new Date().toISOString();
    await supabase.from("outreach_relances").update({ status: "sent", sent_at: sentAt, provider_message_id: providerMessageId, lost_at: row.sequence === 3 ? new Date(Date.now() + 7 * 86400000).toISOString() : null }).eq("id", row.id);
    if (row.sequence < 3) await supabase.from("outreach_relances").insert({ organization_id: row.organization_id, lead_id: row.lead_id, sequence: row.sequence + 1, status: "planned", body: row.sequence === 1 ? "Bonjour, je voulais simplement vérifier si le sujet vous intéresse toujours. Je peux vous envoyer un exemple concret." : "Dernier message de ma part : souhaitez-vous un échange rapide cette semaine ?", scheduled_for: new Date(Date.now() + nextDelay()).toISOString() });
  } catch (err) {
    await supabase.from("outreach_relances").update({ status: "failed", error_message: err instanceof Error ? err.message : "Relance failed" }).eq("id", row.id);
  }
}

const { data: lostRows } = await supabase.from("outreach_relances").select("organization_id,lead_id,lead:leads(stage)").eq("sequence", 3).eq("status", "sent").lte("lost_at", now.toISOString());
for (const row of lostRows || []) {
  if (row.lead?.stage === "lost" || await hasReply(row.organization_id, row.lead_id)) continue;
  await supabase.from("leads").update({ stage: "lost" }).eq("id", row.lead_id).eq("organization_id", row.organization_id);
  await supabase.from("outreach_relances").update({ status: "lost" }).eq("lead_id", row.lead_id).eq("sequence", 3).eq("status", "sent");
}
console.log(JSON.stringify({ processed: due?.length || 0, lost: lostRows?.length || 0 }));
