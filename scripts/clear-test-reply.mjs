import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase admin credentials are missing");

const organizationId = "8d7e5761-68e0-49df-bf6c-3afcc50b7fca";
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: lead, error: leadError } = await supabase
  .from("leads")
  .select("id, title, stage")
  .eq("organization_id", organizationId)
  .eq("phone_normalized", "212693934445")
  .maybeSingle();
if (leadError) throw leadError;
if (!lead) {
  console.log(JSON.stringify({ found: false }));
  process.exit(0);
}

const { data: replies, error: repliesError } = await supabase
  .from("outreach_replies")
  .select("id, body, received_at")
  .eq("organization_id", organizationId)
  .eq("lead_id", lead.id)
  .order("received_at", { ascending: false });
if (repliesError) throw repliesError;

if (!replies?.length) {
  console.log(JSON.stringify({ found: true, reply_deleted: false, lead: lead.title, stage: lead.stage }));
  process.exit(0);
}

const { error: deleteError } = await supabase
  .from("outreach_replies")
  .delete()
  .eq("organization_id", organizationId)
  .eq("lead_id", lead.id);
if (deleteError) throw deleteError;

const { data: latest, error: latestError } = await supabase
  .from("outreach_messages")
  .select("id, status")
  .eq("organization_id", organizationId)
  .eq("lead_id", lead.id)
  .eq("channel", "whatsapp")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
if (latestError) throw latestError;
if (latest?.status === "sent" || latest?.status === "delivered" || latest?.status === "replied") {
  const { error } = await supabase.from("outreach_messages").update({
    status: "approved",
    provider_message_id: null,
    sent_at: null,
    delivered_at: null,
    replied_at: null,
    error_message: null,
  }).eq("id", latest.id);
  if (error) throw error;
}

const { error: leadUpdateError } = await supabase.from("leads").update({
  stage: "new",
  assigned_to: null,
  last_contact_method: null,
  last_contacted_at: null,
}).eq("id", lead.id).eq("organization_id", organizationId);
if (leadUpdateError) throw leadUpdateError;

console.log(JSON.stringify({ found: true, reply_deleted: true, replies_deleted: replies.length, lead: lead.title, stage: "new", message_status: latest?.status === "sent" || latest?.status === "delivered" || latest?.status === "replied" ? "approved" : latest?.status }));
