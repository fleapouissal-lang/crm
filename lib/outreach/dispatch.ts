import type { SupabaseClient } from "@supabase/supabase-js";
import type { OutreachMessage } from "@/types/database";

type DispatchResult =
  | { success: true; providerMessageId: string | null }
  | { success: false; error: string };

export async function dispatchOutreachMessage(
  supabase: SupabaseClient,
  organizationId: string,
  messageId: string
): Promise<DispatchResult> {
  const { data, error } = await supabase
    .from("outreach_messages")
    .select("*, lead:leads(id, title, company, contact_name, phone, email, contact_permission)")
    .eq("id", messageId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return { success: false, error: "Outreach message not found" };
  if (!['approved', 'queued', 'failed'].includes(data.status)) {
    return { success: false, error: "Message must be approved before sending" };
  }
  if (!data.lead || data.lead.contact_permission === "unknown") {
    return { success: false, error: "Contact permission must be verified before sending" };
  }
  if (data.lead.contact_permission === "opted_out") {
    return { success: false, error: "This contact opted out" };
  }

  const destination = data.channel === "email" ? data.lead.email : data.lead.phone;
  if (!destination) return { success: false, error: `Lead has no ${data.channel} destination` };

  const webhookUrl = process.env.OUTREACH_WEBHOOK_URL;
  if (!webhookUrl) {
    return { success: false, error: "OUTREACH_WEBHOOK_URL is not configured" };
  }

  await supabase
    .from("outreach_messages")
    .update({ status: "sending", error_message: null })
    .eq("id", messageId)
    .eq("organization_id", organizationId);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.OUTREACH_WEBHOOK_SECRET
          ? { authorization: `Bearer ${process.env.OUTREACH_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        message_id: data.id,
        organization_id: organizationId,
        lead: data.lead,
        channel: data.channel,
        destination,
        subject: data.subject,
        body: data.body,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { message_id?: string; id?: string; error?: string }
      | null;
    if (!response.ok) throw new Error(payload?.error || `Provider returned ${response.status}`);

    const providerMessageId = payload?.message_id || payload?.id || null;
    const sentAt = new Date().toISOString();
    await supabase
      .from("outreach_messages")
      .update({
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: sentAt,
        error_message: null,
      })
      .eq("id", messageId)
      .eq("organization_id", organizationId);
    await supabase
      .from("leads")
      .update({
        last_contacted_at: sentAt,
        last_contact_method: data.channel === "email" ? "email" : "phone",
        stage: "contacted",
      })
      .eq("id", data.lead.id)
      .eq("organization_id", organizationId);

    return { success: true, providerMessageId };
  } catch (dispatchError) {
    const message = dispatchError instanceof Error ? dispatchError.message : "Send failed";
    await supabase
      .from("outreach_messages")
      .update({ status: "failed", error_message: message })
      .eq("id", messageId)
      .eq("organization_id", organizationId);
    return { success: false, error: message };
  }
}

export function isSendableOutreach(message: Pick<OutreachMessage, "status">) {
  return ["approved", "queued", "failed"].includes(message.status);
}
