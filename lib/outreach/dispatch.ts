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
    .select("*, lead:leads(id, title, company, contact_name, phone, email, contact_permission, sales_project)")
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
  const useEasyTouch = process.env.OUTREACH_PROVIDER === "easytouch" && data.channel === "whatsapp";
  if (!webhookUrl && !useEasyTouch) {
    return {
      success: false,
      error: data.channel === "email"
        ? "Email sending is not configured yet"
        : "No outreach provider is configured for this channel",
    };
  }

  await supabase
    .from("outreach_messages")
    .update({ status: "sending", error_message: null })
    .eq("id", messageId)
    .eq("organization_id", organizationId);

  try {
    let providerMessageId: string | null = null;
    if (useEasyTouch) {
      const bridgeUrl = process.env.WA_BRIDGE_URL?.replace(/\/$/, "");
      const bridgeSecret = process.env.WA_BRIDGE_SECRET;
      const instanceId = data.lead.sales_project === "Autolog"
        ? process.env.WA_BRIDGE_INSTANCE_ID_AUTOLOG || "autolog_crm"
        : process.env.WA_BRIDGE_INSTANCE_ID_FUSION_LEAP || process.env.WA_BRIDGE_INSTANCE_ID || "fusionleap_crm";
      if (!bridgeUrl || !bridgeSecret) {
        throw new Error("EasyTouch WhatsApp bridge is not configured");
      }

      const parts = Array.isArray(data.message_parts) && data.message_parts.length
        ? data.message_parts.slice(0, 2).map(String).filter((part: string) => part.trim())
        : [data.body];
      const providerIds: string[] = [];
      for (let index = 0; index < parts.length; index += 1) {
        if (index > 0) {
          const humanPause = 3_000 + Math.floor(Math.random() * 2_001);
          await fetch(`${bridgeUrl}/instance/${encodeURIComponent(instanceId)}/typing`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              apikey: bridgeSecret,
            },
            body: JSON.stringify({ number: destination, durationMs: humanPause }),
            signal: AbortSignal.timeout(10_000),
          }).catch(() => undefined);
          await new Promise((resolve) => setTimeout(resolve, humanPause));
        }
        const response = await fetch(`${bridgeUrl}/instance/${encodeURIComponent(instanceId)}/send`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: bridgeSecret,
          },
          body: JSON.stringify({ number: destination, text: parts[index] }),
          signal: AbortSignal.timeout(45_000),
        });
        const payload = (await response.json().catch(() => null)) as
          | { messageId?: string; error?: string }
          | null;
        if (!response.ok) throw new Error(payload?.error || `WhatsApp bridge returned ${response.status}`);
        if (payload?.messageId) providerIds.push(payload.messageId);
      }
      providerMessageId = providerIds.join(",") || null;
    } else {
      const response = await fetch(webhookUrl!, {
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
      providerMessageId = payload?.message_id || payload?.id || null;
    }
    const sentAt = new Date().toISOString();
    await supabase
      .from("outreach_messages")
      .update({
        status: "sent",
        provider: useEasyTouch ? "easytouch_qr" : "webhook",
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
    if (data.channel === "whatsapp") {
      const delayHours = 6 + Math.random() * 6;
      const followUp = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();
      await supabase.from("outreach_relances").upsert({
        organization_id: organizationId,
        lead_id: data.lead.id,
        sequence: 1,
        status: "planned",
        body: "Bonjour, je me permets de revenir vers vous. Souhaitez-vous que je vous montre rapidement comment Autolog peut simplifier votre suivi ?",
        scheduled_for: followUp,
      }, { onConflict: "lead_id,sequence", ignoreDuplicates: true });
    }

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
