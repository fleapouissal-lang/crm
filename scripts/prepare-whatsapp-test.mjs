import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase admin credentials are missing");

const organizationId = "8d7e5761-68e0-49df-bf6c-3afcc50b7fca";
const normalizedPhone = "212693934445";
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: leads, error: leadLookupError } = await supabase
  .from("leads")
  .select("id, title, assigned_to")
  .eq("organization_id", organizationId)
  .or(`phone_normalized.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
  .limit(1);
if (leadLookupError) throw leadLookupError;
if (!leads?.length) throw new Error("Test lead was not found");

const lead = leads[0];
const researchedAt = new Date().toISOString();
const { error: leadUpdateError } = await supabase
  .from("leads")
  .update({
    phone: "+212693934445",
    phone_normalized: normalizedPhone,
    sales_project: "Autolog",
    stage: "new",
    contact_permission: "consented",
    research_notes: [
      "Profil vérifié : contact de test interne autorisé par le propriétaire du numéro.",
      "Objectif : vérifier l’envoi WhatsApp depuis Fusion Leap CRM vers le moteur EasyTouch.",
      "Valeur Autolog : centralisation des réservations, contrats et état du parc.",
      "Confiance de la recherche : high (test interne).",
    ].join("\n"),
    research_sources: ["https://os.fusionleap.net/leads?project=Autolog"],
    researched_at: researchedAt,
  })
  .eq("id", lead.id);
if (leadUpdateError) throw leadUpdateError;

const parts = [
  "سلام يوسف، لاحظت أن أكبر تحدي عند وكالات كراء السيارات هو تتبع الحجوزات والعقود وحالة كل سيارة بلا تشتت.",
  "Autolog كيجمع لك هاد الشي كامل فمكان واحد. واش نوريك كيفاش غادي يخدم على الوكالة ديالك فديمو قصير؟",
];

const { data: message, error: messageError } = await supabase
  .from("outreach_messages")
  .upsert(
    {
      organization_id: organizationId,
      lead_id: lead.id,
      channel: "whatsapp",
      status: "draft",
      body: parts.join("\n\n"),
      message_parts: parts,
      idempotency_key: "whatsapp-test-0693934445-v1",
      error_message: null,
      provider: null,
      provider_message_id: null,
      approved_by: null,
      approved_at: null,
      sent_at: null,
      created_by: lead.assigned_to,
    },
    { onConflict: "organization_id,idempotency_key" }
  )
  .select("id, status, channel, lead_id")
  .single();
if (messageError) throw messageError;

console.log(JSON.stringify({ lead: lead.title, phone: "+212693934445", message }, null, 2));
