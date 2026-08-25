import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BridgeMessage = {
  key?: { id?: string; remoteJid?: string; remoteJidAlt?: string; participantAlt?: string; fromMe?: boolean };
  _mediaType?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
  };
};

function messageText(message: BridgeMessage): string {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    message.message?.imageMessage?.caption ||
    message.message?.videoMessage?.caption ||
    ""
  ).trim();
}

function digits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function sameMoroccanPhone(a: string, b: string): boolean {
  const left = digits(a);
  const right = digits(b);
  if (!left || !right) return false;
  return left === right || left.slice(-9) === right.slice(-9);
}

export async function POST(request: Request) {
  const bridgeSecret = process.env.WA_BRIDGE_SECRET || "";
  const requestSecret = request.headers.get("apikey") || request.headers.get("x-api-key") || "";
  if (!bridgeSecret || requestSecret !== bridgeSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { event?: string; instance?: string; data?: { messages?: BridgeMessage[] } }
    | null;
  if (!body || !["messages.upsert", "MESSAGES_UPSERT"].includes(body.event || "")) {
    return NextResponse.json({ ok: true });
  }

  const organizationId = process.env.WA_BRIDGE_ORGANIZATION_ID;
  const qualifiedAssigneeId = process.env.OUTREACH_QUALIFIED_ASSIGNEE_ID;
  if (!organizationId) {
    return NextResponse.json({ error: "WhatsApp organization is not configured" }, { status: 503 });
  }

  const supabase = createAdminClient();
  for (const incoming of body.data?.messages || []) {
    if (incoming.key?.fromMe) continue;
    const text = messageText(incoming);
    const remotePhone = (incoming.key?.remoteJid || "").replace(/@.+$/, "");
    const replyBody = text || (incoming._mediaType === "audio" ? "رسالة صوتية مستلمة" : "رد وارد مستلم");
    if (!remotePhone || (!text && !incoming._mediaType)) continue;

    const { data: leads } = await supabase
      .from("leads")
      .select("id, title, phone, phone_normalized, stage, assigned_to")
      .eq("organization_id", organizationId)
      .not("phone", "is", null);
    const lead = leads?.find((candidate) =>
      sameMoroccanPhone(remotePhone, candidate.phone_normalized || candidate.phone)
    );
    if (!lead) continue;

    // Any inbound response is a qualified human interaction. This includes
    // positive/negative text and audio: Dalal should review every reply.
    const replySentiment = "positive" as const;
    const { data: latestOutreach } = await supabase
      .from("outreach_messages")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("lead_id", lead.id)
      .eq("channel", "whatsapp")
      .in("status", ["sent", "delivered", "replied"])
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const providerMessageId = incoming.key?.id || null;
    const { error: replyError } = await supabase.from("outreach_replies").upsert(
      {
        organization_id: organizationId,
        lead_id: lead.id,
        outreach_message_id: latestOutreach?.id || null,
        provider_message_id: providerMessageId,
        body: replyBody,
        sentiment: replySentiment,
        received_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,provider_message_id", ignoreDuplicates: true }
    );
    if (replyError) console.error("[whatsapp-bridge] reply log failed", replyError.message);

    if (latestOutreach?.id) {
      await supabase
        .from("outreach_messages")
        .update({ status: "replied", replied_at: new Date().toISOString() })
        .eq("id", latestOutreach.id);
    }

    const leadUpdate: Record<string, string> = {
      last_contact_method: "phone",
      last_contacted_at: new Date().toISOString(),
    };
    if (replySentiment === "positive") {
      leadUpdate.stage = "qualified";
      if (qualifiedAssigneeId) leadUpdate.assigned_to = qualifiedAssigneeId;
    }
    await supabase.from("leads").update(leadUpdate).eq("id", lead.id).eq("organization_id", organizationId);

    await supabase.from("activities").insert({
      organization_id: organizationId,
      type: replySentiment === "positive" ? "lead_stage_changed" : "lead_updated",
      entity_type: "lead",
      entity_id: lead.id,
      user_id: replySentiment === "positive" ? qualifiedAssigneeId || null : null,
        message: `WhatsApp reply detected (${incoming._mediaType === "audio" ? "audio" : "text"}); lead qualified and assigned to Dalal: ${replyBody.slice(0, 240)}`,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "fusionleap-whatsapp-replies" });
}
