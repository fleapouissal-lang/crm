import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase admin credentials are missing");

const organizationId = "8d7e5761-68e0-49df-bf6c-3afcc50b7fca";
const dalalId = "8fb727ea-bad1-45bd-9627-d5482745d02f";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: lead, error: leadError } = await supabase
  .from("leads")
  .select("id, title")
  .eq("organization_id", organizationId)
  .eq("phone_normalized", "212693934445")
  .maybeSingle();
if (leadError || !lead) throw leadError || new Error("Test lead not found");

const { data: outreach } = await supabase
  .from("outreach_messages")
  .select("id")
  .eq("organization_id", organizationId)
  .eq("lead_id", lead.id)
  .eq("channel", "whatsapp")
  .in("status", ["sent", "delivered", "replied"])
  .order("sent_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const receivedAt = new Date().toISOString();
const { error: replyError } = await supabase.from("outreach_replies").insert({
  organization_id: organizationId,
  lead_id: lead.id,
  outreach_message_id: outreach?.id || null,
  provider_message_id: "manual-recovery-lid-test-2026-08-25",
  body: "صراحة مهتم نعرف صيفط ليا",
  sentiment: "positive",
  received_at: receivedAt,
});
if (replyError && replyError.code !== "23505") throw replyError;

if (outreach?.id) {
  const { error } = await supabase
    .from("outreach_messages")
    .update({ status: "replied", replied_at: receivedAt })
    .eq("id", outreach.id);
  if (error) throw error;
}

const { error: updateError } = await supabase
  .from("leads")
  .update({
    stage: "qualified",
    assigned_to: dalalId,
    last_contact_method: "phone",
    last_contacted_at: receivedAt,
  })
  .eq("id", lead.id)
  .eq("organization_id", organizationId);
if (updateError) throw updateError;

await supabase.from("activities").insert({
  organization_id: organizationId,
  type: "lead_stage_changed",
  entity_type: "lead",
  entity_id: lead.id,
  user_id: dalalId,
  message: "Positive WhatsApp reply recovered from LID event; lead qualified and assigned to Dalal.",
});

console.log(JSON.stringify({ lead: lead.title, stage: "qualified", assigned_to: "Dalal Tarek" }));
