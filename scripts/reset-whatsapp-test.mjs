import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase admin credentials are missing");

const organizationId = "8d7e5761-68e0-49df-bf6c-3afcc50b7fca";
const phone = "212693934445";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: oldLead, error: lookupError } = await supabase
  .from("leads")
  .select("id, title, company, contact_name, email, phone")
  .eq("organization_id", organizationId)
  .eq("phone_normalized", phone)
  .maybeSingle();
if (lookupError) throw lookupError;
const sourceLead = oldLead || {
  id: null,
  title: "Youssef Kaab",
  company: "Youssef Kaab",
  contact_name: "Youssef Kaab",
  email: "kaab.yosef@gmail.com",
  phone: "+212693934445",
};

if (sourceLead.id) {
  await supabase.from("activities").delete().eq("organization_id", organizationId).eq("entity_id", sourceLead.id);
  const { error: deleteError } = await supabase.from("leads").delete().eq("id", sourceLead.id).eq("organization_id", organizationId);
  if (deleteError) throw deleteError;
}

const { data: newLead, error: insertError } = await supabase
  .from("leads")
  .insert({
    organization_id: organizationId,
    title: sourceLead.title || "Youssef Kaab",
    company: sourceLead.company || "Youssef Kaab",
    contact_name: sourceLead.contact_name || "Youssef Kaab",
    email: sourceLead.email || "kaab.yosef@gmail.com",
    phone: "+212693934445",
    phone_normalized: phone,
    value: 0,
    stage: "new",
    sales_project: "Autolog",
    source: "internal_test",
    contact_permission: "consented",
    research_notes: "Contact de test interne autorisé par le propriétaire du numéro. Objectif : vérifier l’envoi et la réception WhatsApp.",
    research_sources: ["https://os.fusionleap.net/leads?project=Autolog"],
    researched_at: new Date().toISOString(),
  })
  .select("id, title, phone")
  .single();
if (insertError) throw insertError;

const parts = [
  "سلام يوسف، لاحظت أن أكبر تحدي عند وكالات كراء السيارات هو تتبع الحجوزات والعقود وحالة كل سيارة بلا تشتت.",
  "Autolog كيجمع لك هاد الشي كامل فمكان واحد. واش نوريك كيفاش غادي يخدم على الوكالة ديالك فديمو قصير؟",
];
const { data: draft, error: draftError } = await supabase
  .from("outreach_messages")
  .insert({
    organization_id: organizationId,
    lead_id: newLead.id,
    channel: "whatsapp",
    status: "draft",
    body: parts.join("\n\n"),
    message_parts: parts,
    idempotency_key: `whatsapp-test-${newLead.id}`,
  })
  .select("id, status, channel")
  .single();
if (draftError) throw draftError;

console.log(JSON.stringify({ deleted_lead_id: sourceLead.id, recreated_lead: newLead, draft }, null, 2));
